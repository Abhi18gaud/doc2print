import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const shopId = formData.get('shop_id') as string;
    const pages = parseInt((formData.get('pages') as string) || '1', 10);
    const copies = parseInt((formData.get('copies') as string) || '1', 10);
    const rawPaperSize = (formData.get('paper_size') as string) || 'A4';
    const colorMode = (formData.get('color_mode') as string) || 'bw';
    const duplex = formData.get('duplex') === 'true';
    const orientation = (formData.get('orientation') as string) || 'portrait';
    const price = parseFloat((formData.get('price') as string) || '0');
    const paymentMode = (formData.get('payment_mode') as string) || 'cash';
    const simulatePaid = formData.get('simulate_paid') === 'true';

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

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

    // 1. Upload file to Supabase Storage bucket 'print-files'
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${shopId}/${timestamp}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
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
    const { data: publicUrlData } = supabase.storage
      .from('print-files')
      .getPublicUrl(storagePath);

    const fileUrl = publicUrlData.publicUrl;

    // Determine initial payment and print status
    const isPaidOnline = paymentMode === 'online' && simulatePaid;
    const paymentStatus = isPaidOnline ? 'paid' : 'pending';
    const printStatus = isPaidOnline ? 'queued' : 'pending_payment';

    // 2. Fetch printer for the shop
    const { data: printers } = await supabase
      .from('printers')
      .select('id')
      .eq('shop_id', shopId)
      .limit(1);

    const printerId = printers?.[0]?.id || null;

    // 3. Insert job record into Supabase
    const { data: job, error: insertError } = await supabase
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
        paper_size: normPaperSize,
        color_mode: colorMode === 'color' ? 'color' : 'bw',
        duplex,
        orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
        price,
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
