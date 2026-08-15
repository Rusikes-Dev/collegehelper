import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSession, writeSession } from '@/lib/session';
import { verifySignature, fetchPayment, PRICE_PAISE } from '@/lib/razorpay';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';

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
 */
export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'verify'), LIMITS.verify);
    if (!gate.ok) return apiError('Too many verification attempts. Please wait a minute.', 'RATE_LIMITED', 429);

    const session = await readSession();
    if (!session) return apiError('Your session has expired. Please run your search again.', 'NO_SESSION', 401);
    if (session.paid) return NextResponse.json({ ok: true, alreadyPaid: true });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiError('Payment details were incomplete.', 'BAD_PAYLOAD', 400);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    if (!session.orderId || razorpay_order_id !== session.orderId) {
      console.warn('[payment] order id does not match session', { sid: session.sid });
      return apiError('This payment does not belong to your session.', 'ORDER_MISMATCH', 400);
    }
    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      console.warn('[payment] signature verification failed', { sid: session.sid, order: razorpay_order_id });
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

    await writeSession({ ...session, paid: true, paymentId: razorpay_payment_id, paidAt: Date.now() });
    return NextResponse.json({ ok: true, alreadyPaid: false });
  } catch (e) {
    return handleError(e);
  }
}
