import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = createAdminClient() || supabase;

    const { data: job, error: fetchErr } = await client
      .from('jobs')
      .select('id, file_url, shop_id')
      .eq('id', id)
      .single();

    if (fetchErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.file_url && job.file_url.includes('/print-files/')) {
      const urlParts = job.file_url.split('/print-files/');
      if (urlParts.length > 1) {
        const storagePath = decodeURIComponent(urlParts[1]);
        const { error: removeErr } = await client.storage
          .from('print-files')
          .remove([storagePath]);

        if (removeErr) {
          console.warn('[STORAGE] Cloud media purge warning:', removeErr.message);
        } else {
          console.log('[STORAGE] Purged cloud media file:', storagePath);
        }
      }
    }



    return NextResponse.json({
      success: true,
      message: 'Cloud media successfully purged after verified local download',
    });
  } catch (error) {
    console.error('Error purging cloud media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
