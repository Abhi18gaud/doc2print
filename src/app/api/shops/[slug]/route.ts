import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/server';
import { DEFAULT_PRICE_CONFIG } from '@/lib/price-calculator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    if (!cleanSlug) {
      return NextResponse.json({ error: 'Shop identifier required' }, { status: 400 });
    }

    const client = createAdminClient() || supabase;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSlug);

    let shop = null;

    // 1. Try finding by UUID id
    if (isUuid) {
      const { data } = await client
        .from('shops')
        .select('*')
        .eq('id', cleanSlug)
        .limit(1);
      if (data && data.length > 0) shop = data[0];
    }

    // 2. Try finding by qr_code_slug
    if (!shop && cleanSlug !== 'counter' && cleanSlug !== 'demo') {
      const { data } = await client
        .from('shops')
        .select('*')
        .eq('qr_code_slug', cleanSlug)
        .limit(1);
      if (data && data.length > 0) shop = data[0];
    }

    // 3. Try finding by owner_id (if cleanSlug was user ID)
    if (!shop && isUuid) {
      const { data } = await client
        .from('shops')
        .select('*')
        .eq('owner_id', cleanSlug)
        .limit(1);
      if (data && data.length > 0) shop = data[0];
    }

    // 4. Fallback for demo/counter
    if (!shop && (cleanSlug === 'counter' || cleanSlug === 'demo')) {
      const { data } = await client
        .from('shops')
        .select('*')
        .limit(1);
      if (data && data.length > 0) shop = data[0];
    }

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found', slug: cleanSlug },
        { status: 404 }
      );
    }

    // Fetch active printers for this shop
    const { data: printers } = await supabase
      .from('printers')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: true });

    const activePrinter = printers?.find((p) => p.status === 'online') || printers?.[0];

    return NextResponse.json({
      shop: {
        ...shop,
        price_config: shop.price_config || DEFAULT_PRICE_CONFIG,
      },
      printer: activePrinter || null,
      isOnline: activePrinter?.status === 'online',
    });
  } catch (error) {
    console.error('Error fetching shop by slug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
