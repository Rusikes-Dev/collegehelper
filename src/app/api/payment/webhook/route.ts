import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhookSignature, webhooksConfigured } from '@/lib/razorpay';
import {
  findPaymentByOrder, markPaymentCaptured, markPaymentFailed, grantAccess,
  getAccessState, upsertUser, recordEvent, supabaseConfigured, ACCESS_DAYS,
} from '@/lib/db';

export const runtime = 'nodejs';

/**
 * The safety net under the payment flow.
 *
 * Students pay on phones, on patchy connections, in UPI apps that switch away
 * from the browser and sometimes do not come back. When that happens the money
 * is taken but /api/payment/verify is never called, and without this route the
 * student is left paid-but-locked-out and has to email you.
 *
 * Because the email and phone number are collected *before* the payment, the
 * order row already knows who the buyer is, so access can be granted here with
 * no browser involved at all. The student then restores access with the same
 * email and phone.
 *
 * Configure at Razorpay → Settings → Webhooks:
 *   URL:    https://your-domain.com/api/payment/webhook
 *   Events: payment.captured, payment.failed
 *   Secret: the value of RAZORPAY_WEBHOOK_SECRET
 */

interface RazorpayWebhook {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string; order_id?: string; amount?: number; status?: string; method?: string;
        email?: string; contact?: string;
        error_code?: string; error_description?: string;
      };
    };
  };
}

export async function POST(req: Request) {
  // Razorpay retries non-2xx responses, so anything we cannot act on is
  // acknowledged rather than rejected: a retry loop would not fix it.
  try {
    if (!webhooksConfigured() || !supabaseConfigured()) {
      return NextResponse.json({ ok: true, ignored: 'not_configured' });
    }

    const raw = await req.text();
    const signature = (await headers()).get('x-razorpay-signature') ?? '';

    if (!signature || !verifyWebhookSignature(raw, signature)) {
      console.warn('[webhook] bad signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const body = JSON.parse(raw) as RazorpayWebhook;
    const entity = body.payload?.payment?.entity;
    const orderId = entity?.order_id;
    if (!orderId) return NextResponse.json({ ok: true, ignored: 'no_order' });

    if (body.event === 'payment.failed') {
      await markPaymentFailed({
        orderId,
        paymentId: entity?.id ?? null,
        code: entity?.error_code ?? null,
        description: entity?.error_description ?? null,
      }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    if (body.event !== 'payment.captured') return NextResponse.json({ ok: true, ignored: body.event });

    const order = await findPaymentByOrder(orderId);
    if (!order) {
      console.warn('[webhook] captured payment for an unknown order', orderId);
      return NextResponse.json({ ok: true, ignored: 'unknown_order' });
    }

    await markPaymentCaptured({
      orderId,
      paymentId: entity?.id ?? orderId,
      method: entity?.method ?? null,
      amountPaise: entity?.amount,
    }).catch(() => {});

    // Prefer the user we already linked at order time; fall back to the
    // contact details stored on the order row.
    let userId = order.user_id;
    if (!userId && order.email && order.phone) {
      userId = (await upsertUser({ email: order.email, phone: order.phone })).id;
    }
    if (!userId) return NextResponse.json({ ok: true, ignored: 'no_user' });

    const existing = await getAccessState(userId);
    if (!existing.active) {
      await grantAccess({
        userId,
        source: 'payment',
        days: ACCESS_DAYS,
        paymentRowId: order.id,
        note: `webhook ${body.event} for order ${orderId}`,
      });
    }

    recordEvent({ name: 'payment_captured_webhook', userId, props: { order_id: orderId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[webhook] failed', e);
    // Acknowledge anyway; a retry storm helps nobody.
    return NextResponse.json({ ok: true, error: 'handled' });
  }
}
