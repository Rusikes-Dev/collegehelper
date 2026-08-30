import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import { grantAccess, setAccessCookie, hasActiveGrant, anonId } from '@/lib/access';
import { track } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

const schema = z.object({
  razorpay_order_id: z.string().min(4).max(80),
  razorpay_payment_id: z.string().min(4).max(80),
  razorpay_signature: z.string().min(16).max(200),
});

/**
 * Verifies a Checkout result server-side. The browser's "payment succeeded"
 * callback is treated as a claim, not a fact: access is granted only if the
 * HMAC signature matches, and only for the user attached to the stored order.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payment response.' }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const valid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  const db = supabaseAdmin();
  const { data: payment } = await db
    .from('payments')
    .select('id, user_id, status')
    .eq('razorpay_order_id', razorpay_order_id)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: 'We could not find that order.' }, { status: 404 });
  }

  if (!valid) {
    await db
      .from('payments')
      .update({ status: 'failed', failure_reason: 'signature_mismatch' })
      .eq('id', payment.id);
    await track('payment_failed', { userId: payment.user_id as string });
    return NextResponse.json(
      { error: 'We could not verify this payment. You have not been charged for access.' },
      { status: 400 },
    );
  }

  const userId = payment.user_id as string;

  // Idempotent: the webhook may have processed this payment already.
  if (payment.status !== 'paid') {
    await db
      .from('payments')
      .update({
        status: 'paid',
        razorpay_payment_id,
        razorpay_signature,
      })
      .eq('id', payment.id);
  }

  if (!(await hasActiveGrant(userId))) {
    const settings = await getSettings();
    await grantAccess({
      userId,
      source: 'payment',
      paymentId: payment.id as string,
      ttlDays: settings.accessTtlDays,
    });
  }

  setAccessCookie(userId);
  await track('payment_success', { anonId: anonId(), userId });

  return NextResponse.json({ ok: true });
}
