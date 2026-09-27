import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/server';
import { calculatePrintPrice, DEFAULT_PRICE_CONFIG } from '@/lib/price-calculator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawShopId = (formData.get('shop_id') as string || '').trim();
    const pages = parseInt((formData.get('pages') as string) || '1', 10);
    const copies = parseInt((formData.get('copies') as string) || '1', 10);
    const rawPaperSize = (formData.get('paper_size') as string) || 'A4';
    const colorMode = (formData.get('color_mode') as string) || 'bw';
    const duplex = formData.get('duplex') === 'true';
    const binding = formData.get('binding') === 'true';
    const stapling = formData.get('stapling') === 'true';
    const orientation = (formData.get('orientation') as string) || 'portrait';
    const clientPrice = parseFloat((formData.get('price') as string) || '0');
    const paymentMode = (formData.get('payment_mode') as string) || 'cash';
    const simulatePaid = formData.get('simulate_paid') === 'true';

    if (!rawShopId) {
      return NextResponse.json({ error: 'Shop ID or slug is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const client = createAdminClient() || supabase;

    // Resolve shop by UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawShopId);
    let targetShop = null;

    if (isUuid) {
      const { data } = await client
        .from('shops')
        .select('*')
        .eq('id', rawShopId)
        .limit(1);
      if (data && data.length > 0) targetShop = data[0];
    }

    if (!targetShop) {
      const { data } = await client
        .from('shops')
        .select('*')
        .eq('qr_code_slug', rawShopId)
        .limit(1);
      if (data && data.length > 0) targetShop = data[0];
    }

    if (!targetShop) {
      return NextResponse.json({ error: 'Shop not found or inactive' }, { status: 404 });
    }

    // Requirement 12 & 13: Enforce shop order intake status (Pause Orders)
    const isOrdersPaused = targetShop.price_config?.is_accepting_orders === false || targetShop.price_config?.orders_paused === true;
    if (isOrdersPaused) {
      return NextResponse.json(
        { error: 'This print shop is currently busy and has paused taking new orders. Please check with the counter operator.' },
        { status: 403 }
      );
    }

    // Requirement 4, 5, 6: Validate requested payment mode against shop configuration
    const payConfig = targetShop.price_config?.payment_methods || { enable_upi: true, enable_cash: true };
    const isUpiEnabled = payConfig.enable_upi !== false;
    const isCashEnabled = payConfig.enable_cash !== false;

    if (!isUpiEnabled && !isCashEnabled) {
      return NextResponse.json(
        { error: 'No customer payment method is currently enabled for this shop. Please ask the shopkeeper at the counter.' },
        { status: 400 }
      );
    }

    if (paymentMode === 'online' && !isUpiEnabled) {
      return NextResponse.json(
        { error: 'Online UPI payments are disabled by this shop. Please choose an enabled payment method.' },
        { status: 400 }
      );
    }

    if (paymentMode === 'cash' && !isCashEnabled) {
      return NextResponse.json(
        { error: 'Cash payments are disabled by this shop. Please choose an enabled payment method.' },
        { status: 400 }
      );
    }

    const shopId = targetShop.id;

    // Normalize file_type to 'pdf' | 'jpg' | 'png'
    let normFileType = 'pdf';
    const rawType = (file.type || '').toLowerCase();
    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    if (rawType.includes('png') || ext === 'png') normFileType = 'png';
    else if (rawType.includes('jpeg') || rawType.includes('jpg') || ext === 'jpg' || ext === 'jpeg') normFileType = 'jpg';
    else normFileType = 'pdf';

    const mode = (formData.get('mode') as 'document' | 'photo') || 'document';
    const paperType = (formData.get('paper_type') as string) || 'plain';
    const quality = (formData.get('quality') as string) || 'normal';
    const photoSize = (formData.get('photo_size') as string) || '';
    const photoPaper = (formData.get('photo_paper') as string) || 'glossy';
    const photoQuality = (formData.get('photo_quality') as string) || 'standard';
    const selectedPagesStr = (formData.get('selected_pages') as string) || '';

    let selectedPages: number[] = [];
    if (selectedPagesStr) {
      try {
        selectedPages = JSON.parse(selectedPagesStr);
      } catch (e) {
        selectedPages = selectedPagesStr.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      }
    }
    const effectivePages = selectedPages.length > 0 ? selectedPages.length : pages;

    // Requirement 3: Price must be strictly server-authoritative
    const serverCalc = calculatePrintPrice({
      mode,
      pages: effectivePages,
      copies,
      colorMode: colorMode === 'color' ? 'color' : 'bw',
      paperSize: rawPaperSize,
      paperType,
      quality,
      photoSize,
      photoPaper,
      photoQuality,
      duplex,
      binding,
      stapling,
      priceConfig: targetShop.price_config || DEFAULT_PRICE_CONFIG,
    });
    // Never trust client price; always enforce server-calculated authoritative price
    const finalPrice = serverCalc.total;

    let finalPaperSize = rawPaperSize.toUpperCase();
    if (mode === 'photo') {
      finalPaperSize = `Photo ${photoSize || '4x6'} (${photoPaper || 'Glossy'})`;
    } else {
      finalPaperSize = `${rawPaperSize.toUpperCase()} (${paperType})`;
      if (binding) finalPaperSize += ' + Spiral Binding';
      else if (stapling) finalPaperSize += ' + Corner Stapling';
    }

    // 1. Upload file to Supabase Storage bucket 'print-files'
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${shopId}/${timestamp}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await client.storage
      .from('print-files')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage: ' + uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = client.storage
      .from('print-files')
      .getPublicUrl(storagePath);

    const fileUrl = publicUrlData.publicUrl;

    // Determine initial payment and print status
    const isPaidOnline = paymentMode === 'online' && simulatePaid;
    const paymentStatus = isPaidOnline ? 'paid' : (paymentMode === 'cash' ? 'pending' : 'pending');
    const printStatus = isPaidOnline ? 'queued' : 'pending_payment';

    // 2. Fetch printer for the shop
    const { data: printers } = await client
      .from('printers')
      .select('id')
      .eq('shop_id', shopId)
      .limit(1);

    const printerId = printers?.[0]?.id || null;

    // Requirement 25-28: Scoped Daily Token Numbering starting from 01, resetting per shop business day
    const shopTimezone = targetShop.timezone || targetShop.price_config?.timezone || 'Asia/Kolkata';
    let startOfDayIso = '';
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: shopTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const [yearStr, monthStr, dayStr] = formatter.format(now).split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);

      const d = new Date(Date.UTC(year, month, day, 0, 0, 0));
      const utcDate = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(d.toLocaleString('en-US', { timeZone: shopTimezone }));
      const offsetMs = tzDate.getTime() - utcDate.getTime();
      startOfDayIso = new Date(d.getTime() - offsetMs).toISOString();
    } catch {
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      startOfDayIso = now.toISOString();
    }

    // Count today's existing jobs for this shop to generate the sequential daily token
    const { count: todayJobsCount } = await client
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gte('created_at', startOfDayIso);

    const dailyTokenNumber = (todayJobsCount || 0) + 1;

    // 3. Insert job record into Supabase (Permanent unique UUID id + scoped daily_token)
    const { data: job, error: insertError } = await client
      .from('jobs')
      .insert({
        shop_id: shopId,
        printer_id: printerId,
        token_number: dailyTokenNumber,
        file_url: fileUrl,
        file_name: file.name,
        file_type: normFileType,
        file_size_bytes: file.size,
        pages,
        copies,
        paper_size: finalPaperSize,
        color_mode: colorMode === 'color' ? 'color' : 'bw',
        duplex,
        orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
        price: finalPrice,
        payment_mode: paymentMode === 'online' ? 'online' : 'cash',
        payment_status: paymentStatus,
        print_status: printStatus,
        queued_at: isPaidOnline ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase job insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create job record: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error: unknown) {
    console.error('Error creating job:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
