import { NextRequest, NextResponse } from 'next/server';
import { createUserClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ownerName, email, phone, shopName, address, slug, accessToken } = body;

    if (!ownerName || !email || !shopName) {
      return NextResponse.json(
        { error: 'Name, email, and shop name are required.' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication is required. Please sign up first.' },
        { status: 401 }
      );
    }

    // Use user-authenticated client (respects RLS with auth.uid() = id)
    // Fall back to admin client only if no access token was provided
    const db = accessToken ? createUserClient(accessToken) : createAdminClient();

    const normalizedEmail = email.trim().toLowerCase();
    const ownerId = userId;

    // 1. Upsert Owner — RLS requires auth.uid() = id; our user client provides that
    const { error: ownerErr } = await db.from('owners').upsert({
      id: ownerId,
      name: ownerName.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
    });

    if (ownerErr) {
      console.error('Owner upsert error:', ownerErr);
      return NextResponse.json(
        { error: 'Failed to create owner profile: ' + ownerErr.message },
        { status: 500 }
      );
    }

    // 2. Check if owner already has a shop
    let shopId = crypto.randomUUID();
    let cleanSlug = (slug || shopName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSlug) {
      cleanSlug = `shop-${Date.now().toString().slice(-6)}`;
    }

    const { data: existingShops } = await db
      .from('shops')
      .select('id, qr_code_slug')
      .eq('owner_id', ownerId)
      .limit(1);

    if (existingShops && existingShops.length > 0) {
      // Already has a shop — reuse it
      shopId = existingShops[0].id;
      cleanSlug = existingShops[0].qr_code_slug;
    } else {
      // New shop — ensure slug uniqueness
      const { data: slugTaken } = await db
        .from('shops')
        .select('id')
        .eq('qr_code_slug', cleanSlug)
        .maybeSingle();

      if (slugTaken) {
        cleanSlug = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Insert shop with default pricing
      const defaultPriceConfig = {
        currency: 'INR',
        currencySymbol: '₹',
        rates: { bw: 2.0, color: 10.0 },
        paperSizes: {
          a4: { name: 'A4', extra: 0, description: 'Standard 75 GSM' },
          a3: { name: 'A3', extra: 4, description: 'Large Sheet' },
          passport: { name: 'Passport (8×)', extra: 30, description: 'Glossy Sheet' },
          custom: { name: 'Legal/Bond', extra: 2, description: 'Legal/Bond' },
        },
        duplexDiscount: 0,
        taxPercentage: 0,
      };

      const { error: shopErr } = await db.from('shops').insert({
        id: shopId,
        owner_id: ownerId,
        name: shopName.trim(),
        qr_code_slug: cleanSlug,
        address: address?.trim() || null,
        price_config: defaultPriceConfig,
      });

      if (shopErr) {
        console.error('Shop insert error:', shopErr);
        return NextResponse.json(
          { error: 'Failed to create shop: ' + shopErr.message },
          { status: 500 }
        );
      }

      // 3. Ensure 14-day trial subscription
      const { data: existingSub } = await db
        .from('subscriptions')
        .select('id')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (!existingSub) {
        await db.from('subscriptions').insert({
          shop_id: shopId,
          plan: 'pro_kiosk',
          status: 'trialing',
          trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
        });
      }

      // 4. Create default printer entry
      const { data: existingPrinter } = await db
        .from('printers')
        .select('id')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (!existingPrinter) {
        await db.from('printers').insert({
          shop_id: shopId,
          name: 'Counter Main Printer',
          display_name: 'Tray A-4',
          status: 'online',
          last_seen_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      ownerId,
      shopId,
      slug: cleanSlug,
    });
  } catch (error: unknown) {
    console.error('Signup API error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
