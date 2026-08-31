import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import { grantAccess, hasActiveGrant } from '@/lib/access';

export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook. This is the safety net for the case the spec calls out:
 * the payment succeeded but the browser callback never arrived (tab closed,
 * network dropped). Razorpay retries the webhook, so access still lands.
 *
 * The raw body must be read as text before parsing, because the signature is
 * computed over the exact bytes sent.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const entity = event?.payload?.payment?.entity;
  const orderId: string | undefined = entity?.order_id;
  if (!orderId) return NextResponse.json({ ok: true });

  const { data: payment } = await db
    .from('payments')
    .select('id, user_id, status')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();
  if (!payment) return NextResponse.json({ ok: true });

  const userId = payment.user_id as string;

  if (event.event === 'payment.captured') {
    if (payment.status !== 'paid') {
      await db
        .from('payments')
        .update({ status: 'paid', razorpay_payment_id: entity.id })
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
  } else if (event.event === 'payment.failed') {
    await db
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: entity?.error_description ?? 'unknown',
      })
      .eq('id', payment.id);
  } else if (event.event === 'refund.processed') {
    await db.from('payments').update({ status: 'refunded' }).eq('id', payment.id);
    await db
      .from('access_grants')
      .update({ revoked_at: new Date().toISOString(), reason: 'refund' })
      .eq('payment_id', payment.id)
      .is('revoked_at', null);
  }

  return NextResponse.json({ ok: true });
}
