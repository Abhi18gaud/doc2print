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

    // Normalize paper_size to 'A4' | 'A3' | 'passport' | 'custom'
    let normPaperSize = 'A4';
    const lowerPaper = rawPaperSize.toLowerCase();
    if (lowerPaper === 'a3') normPaperSize = 'A3';
    else if (lowerPaper === 'passport') normPaperSize = 'passport';
    else if (lowerPaper === 'custom' || lowerPaper === 'legal') normPaperSize = 'custom';
    else normPaperSize = 'A4';

    // Requirement 3: Price must be server-authoritative
    const serverCalc = calculatePrintPrice({
      pages,
      copies,
      colorMode: colorMode === 'color' ? 'color' : 'bw',
      paperSize: normPaperSize,
      duplex,
      binding,
      stapling,
      priceConfig: targetShop.price_config || DEFAULT_PRICE_CONFIG,
    });
    // Never trust client price; always enforce server-calculated authoritative price
    const finalPrice = serverCalc.total;

    let finalPaperSize = normPaperSize;
    if (binding) finalPaperSize = `${normPaperSize} + Spiral Binding`;
    else if (stapling) finalPaperSize = `${normPaperSize} + Corner Stapling`;

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

    // 3. Insert job record into Supabase
    const { data: job, error: insertError } = await client
      .from('jobs')
      .insert({
        shop_id: shopId,
        printer_id: printerId,
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
