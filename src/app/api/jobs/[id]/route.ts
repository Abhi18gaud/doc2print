import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: job, error } = await supabase
      .from('jobs')
      .select('*, shops(name, qr_code_slug, address)')
      .eq('id', id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Calculate position ahead: count jobs in 'queued' or 'printing' created before this job in the same shop
    let positionAhead = 0;
    if (job.print_status === 'queued' || job.print_status === 'printing') {
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', job.shop_id)
        .in('print_status', ['queued', 'printing'])
        .lt('created_at', job.created_at);

      positionAhead = count || 0;
    } else if (job.print_status === 'pending_payment') {
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', job.shop_id)
        .in('print_status', ['queued', 'printing']);

      positionAhead = count || 0;
    }

    return NextResponse.json({
      job,
      positionAhead,
    });
  } catch (error) {
    console.error('Error fetching job details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
