import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. Mark job as paid and queued
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update({
        payment_status: 'paid',
        payment_mode: 'online',
        print_status: 'queued',
        queued_at: now,
      })
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Insert payment record
    await supabase.from('payments').insert({
      job_id: jobId,
      gateway_payment_id: `CF_SIM_${Date.now()}`,
      gateway_order_id: `ORDER_${job.token_number}`,
      amount: job.price || 0,
      status: 'PAID_SUCCESS',
      raw_response: { mode: 'online_upi_simulation', time: now },
    });

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (error) {
    console.error('Error simulating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
