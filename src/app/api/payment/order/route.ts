import { NextResponse } from 'next/server';
import { readSession, writeSession } from '@/lib/session';
import { createOrder, PRICE_PAISE } from '@/lib/razorpay';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';

/**
 * Creates a Razorpay order for the current session.
 *
 * The amount is fixed server-side. Nothing about the price, the session, or the
 * search is read from the request body.
 */
export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'order'), LIMITS.createOrder);
    if (!gate.ok) return apiError('Too many payment attempts. Please wait a minute.', 'RATE_LIMITED', 429);

    const session = await readSession();
    if (!session) return apiError('Your session has expired. Please run your search again.', 'NO_SESSION', 401);
    if (session.paid) return NextResponse.json({ alreadyPaid: true, message: 'This search is already unlocked.' });

    // Reuse a pending order so a retry or a double tap cannot create a second charge.
    if (session.orderId) {
      return NextResponse.json({
        orderId: session.orderId,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: PRICE_PAISE,
        currency: 'INR',
        reused: true,
      });
    }

    const order = await createOrder(`jcf_${session.sid.slice(0, 30)}`, { sid: session.sid });
    await writeSession({ ...session, orderId: order.id });

    return NextResponse.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      reused: false,
    });
  } catch (e) {
    return handleError(e);
  }
}
