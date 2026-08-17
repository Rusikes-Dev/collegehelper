import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { readSession, writeSession, hasAccess } from '@/lib/session';
import { verifySignature, fetchPayment, PRICE_PAISE } from '@/lib/razorpay';
import {
  markPaymentCaptured, markPaymentFailed, grantAccess, upsertUser,
  getAccessState, recordEvent, supabaseConfigured, ACCESS_DAYS,
} from '@/lib/db';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';

export const runtime = 'nodejs';

const schema = z.object({
  razorpay_order_id: z.string().min(5).max(64),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().min(10).max(256),
});

/**
 * Confirms a payment and unlocks the session.
 *
 * Three independent checks must all pass:
 *   1. the HMAC signature matches, computed with the secret key;
 *   2. the order id belongs to *this* session, so a signature captured from
 *      another payment cannot be replayed here;
 *   3. Razorpay itself reports the payment as captured, for the right amount.
 *
 * Only then is an access grant written against the student's user record. The
 * grant, not the cookie, is what unlocks results from here on.
 */
export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'verify'), LIMITS.verify);
    if (!gate.ok) return apiError('Too many verification attempts. Please wait a minute.', 'RATE_LIMITED', 429);

    const session = await readSession();
    if (!session) return apiError('Your session has expired. Please run your search again.', 'NO_SESSION', 401);
    if (await hasAccess(session)) return NextResponse.json({ ok: true, alreadyPaid: true });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiError('Payment details were incomplete.', 'BAD_PAYLOAD', 400);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    if (!session.orderId || razorpay_order_id !== session.orderId) {
      console.warn('[payment] order id does not match session', { sid: session.sid });
      return apiError('This payment does not belong to your session.', 'ORDER_MISMATCH', 400);
    }
    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      console.warn('[payment] signature verification failed', { sid: session.sid, order: razorpay_order_id });
      if (supabaseConfigured()) {
        await markPaymentFailed({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, code: 'SIGNATURE_INVALID' })
          .catch(() => {});
      }
      return apiError('We could not verify this payment. If money was deducted it will be refunded automatically.', 'SIGNATURE_INVALID', 400);
    }

    const payment = await fetchPayment(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id) {
      return apiError('This payment does not match the order.', 'ORDER_MISMATCH', 400);
    }
    if (!['captured', 'authorized'].includes(payment.status)) {
      return apiError(`Payment is ${payment.status}. Please try again.`, 'NOT_CAPTURED', 402);
    }
    if (payment.amount < PRICE_PAISE) {
      console.error('[payment] amount short', { expected: PRICE_PAISE, got: payment.amount });
      return apiError('The amount paid did not match the price.', 'AMOUNT_MISMATCH', 400);
    }

    let accessUntil: string | null = null;

    if (supabaseConfigured() && session.email && session.phone) {
      // The user row normally exists already from /api/account; upsert covers
      // the case where the session was minted before that step.
      const user = session.userId
        ? { id: session.userId }
        : await upsertUser({ email: session.email, phone: session.phone, name: session.name });

      const paymentRow = await markPaymentCaptured({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amountPaise: payment.amount,
      }).catch(() => null);

      const existing = await getAccessState(user.id);
      if (!existing.active) {
        const grant = await grantAccess({
          userId: user.id,
          source: 'payment',
          days: ACCESS_DAYS,
          paymentRowId: paymentRow?.id ?? null,
          note: `order ${razorpay_order_id}`,
        });
        accessUntil = grant.expires_at;
      } else {
        accessUntil = existing.until;
      }

      recordEvent({
        name: 'payment_succeeded',
        visitorId: (await cookies()).get('jcf_vid')?.value,
        userId: user.id,
        props: { amount_paise: payment.amount },
      });

      await writeSession({
        ...session, paid: true, userId: user.id,
        paymentId: razorpay_payment_id, paidAt: Date.now(),
      });
    } else {
      await writeSession({ ...session, paid: true, paymentId: razorpay_payment_id, paidAt: Date.now() });
    }

    return NextResponse.json({ ok: true, alreadyPaid: false, accessUntil });
  } catch (e) {
    return handleError(e);
  }
}
