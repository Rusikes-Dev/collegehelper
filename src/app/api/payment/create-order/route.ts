import { NextResponse } from 'next/server';
import { contactSchema } from '@/lib/validation';
import { getSettings } from '@/lib/settings';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createOrder } from '@/lib/razorpay';
import { anonId, hasActiveGrant, setAccessCookie } from '@/lib/access';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { track } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

/**
 * Creates the user record and a Razorpay order. The amount is read from
 * site_settings on the server; the browser never sends a price, so a tampered
 * client cannot pay one rupee for a forty-nine rupee product.
 */
export async function POST(req: Request) {
  const parsed = contactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check your details.' },
      { status: 422 },
    );
  }
  const { name, email, phone } = parsed.data;

  const limit = await checkRateLimit(`order:${clientIp()}`, 10, 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again in a little while.' },
      { status: 429 },
    );
  }

  const settings = await getSettings();
  if (settings.accessMode === 'FREE') {
    return NextResponse.json(
      { error: 'The predictor is currently free \u2014 no payment is needed.' },
      { status: 409 },
    );
  }

  const db = supabaseAdmin();

  const { data: user, error: userErr } = await db
    .from('app_users')
    .upsert({ name, email, phone }, { onConflict: 'email,phone' })
    .select('id')
    .single();
  if (userErr || !user) {
    console.error('user upsert failed:', userErr?.message);
    return NextResponse.json({ error: 'Could not save your details.' }, { status: 500 });
  }
  const userId = user.id as string;

  // Duplicate-payment protection: if they already hold access, don't charge
  // again — just let them back in.
  if (await hasActiveGrant(userId)) {
    setAccessCookie(userId);
    return NextResponse.json({ alreadyHasAccess: true });
  }

  try {
    const order = await createOrder({
      amountPaise: settings.pricePaise,
      currency: settings.currency,
      receipt: `ch_${userId.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: userId, product: 'mhtcet_predictor' },
    });

    await db.from('payments').insert({
      user_id: userId,
      razorpay_order_id: order.id,
      amount_paise: settings.pricePaise,
      currency: settings.currency,
      status: 'created',
    });

    await track('payment_started', { anonId: anonId(), userId });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      prefill: { name, email, contact: phone },
    });
  } catch (e) {
    console.error('razorpay order failed:', e);
    return NextResponse.json(
      { error: 'Payment could not be started. Please try again.' },
      { status: 502 },
    );
  }
}
