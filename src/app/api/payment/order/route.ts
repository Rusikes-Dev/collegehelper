import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSession, writeSession, hasAccess } from '@/lib/session';
import { createOrder, PRICE_PAISE } from '@/lib/razorpay';
import { recordOrder, recordEvent, supabaseConfigured } from '@/lib/db';
import { decodeAttribution } from '@/lib/attribution';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Creates a Razorpay order for the current session.
 *
 * The amount is fixed server-side. Nothing about the price, the session, or the
 * search is read from the request body.
 *
 * The order row is written to the database before the payment window opens, so
 * an abandoned checkout is still visible in the admin panel, and so the webhook
 * can find the buyer if the browser never comes back to confirm.
 */
export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'order'), LIMITS.createOrder);
    if (!gate.ok) return apiError('Too many payment attempts. Please wait a minute.', 'RATE_LIMITED', 429);

    const session = await readSession();
    if (!session) return apiError('Your session has expired. Please run your search again.', 'NO_SESSION', 401);

    if (await hasAccess(session)) {
      return NextResponse.json({ alreadyPaid: true, message: 'This search is already unlocked.' });
    }

    // Contact details are collected first so a completed payment can always be
    // matched back to a person, even if this browser never returns.
    if (!session.email || !session.phone) {
      return apiError('Add your email address and mobile number before paying.', 'CONTACT_REQUIRED', 400);
    }

    // Reuse a pending order so a retry or a double tap cannot create a second charge.
    if (session.orderId) {
      return NextResponse.json({
        orderId: session.orderId,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: PRICE_PAISE,
        currency: 'INR',
        prefill: { name: session.name ?? '', email: session.email, contact: `+91${session.phone}` },
        reused: true,
      });
    }

    const order = await createOrder(`jcf_${session.sid.slice(0, 30)}`, { sid: session.sid });
    await writeSession({ ...session, orderId: order.id });

    if (supabaseConfigured()) {
      const jar = await cookies();
      await recordOrder({
        orderId: order.id,
        amountPaise: order.amount,
        userId: session.userId ?? null,
        email: session.email,
        phone: session.phone,
        sessionSid: session.sid,
        search: { student: session.student, preferences: session.preferences },
        attribution: decodeAttribution(jar.get('jcf_attr')?.value),
      });
      recordEvent({ name: 'payment_initiated', visitorId: jar.get('jcf_vid')?.value, userId: session.userId });
    }

    return NextResponse.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      prefill: { name: session.name ?? '', email: session.email, contact: `+91${session.phone}` },
      reused: false,
    });
  } catch (e) {
    return handleError(e);
  }
}
