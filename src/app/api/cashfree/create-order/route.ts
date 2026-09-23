import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const isSandbox = (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase() === 'SANDBOX';

    // If Cashfree credentials are not configured, offer simulation session
    if (!appId || !secretKey) {
      return NextResponse.json({
        isSimulation: true,
        orderId: `SIM_ORDER_${job.token_number}_${Date.now()}`,
        amount: job.price,
        currency: 'INR',
        message: 'Cashfree API keys not detected. Dev/Test simulation enabled.',
      });
    }

    // Call Cashfree PG Order Creation API
    const orderId = `QP_${job.token_number}_${Date.now()}`;
    const baseUrl = isSandbox
      ? 'https://sandbox.cashfree.com/pg'
      : 'https://api.cashfree.com/pg';

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': process.env.CASHFREE_API_VERSION || '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: job.price,
        order_currency: 'INR',
        customer_details: {
          customer_id: `cust_${job.id.slice(0, 8)}`,
          customer_phone: '9999999999',
          customer_name: 'Counter Customer',
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/kiosk/token/${job.id}?order_id={order_id}`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('Cashfree API error, falling back to simulated checkout:', data);
      return NextResponse.json({
        isSimulation: true,
        orderId,
        amount: job.price,
        currency: 'INR',
        fallbackReason: data.message || 'Cashfree API returned error',
      });
    }

    return NextResponse.json({
      isSimulation: false,
      paymentSessionId: data.payment_session_id,
      orderId: data.order_id,
      amount: job.price,
    });
  } catch (error) {
    console.error('Error creating Cashfree order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
