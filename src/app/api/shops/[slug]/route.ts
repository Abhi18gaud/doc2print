import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { DEFAULT_PRICE_CONFIG } from '@/lib/price-calculator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    let query = supabase.from('shops').select('*');
    if (slug === 'counter' || slug === 'demo') {
      query = query.limit(1);
    } else {
      query = query.or(`qr_code_slug.eq.${slug},id.eq.${slug}`).limit(1);
    }

    const { data: shops, error: shopError } = await query;
    const shop = shops && shops.length > 0 ? shops[0] : null;

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found', slug },
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
