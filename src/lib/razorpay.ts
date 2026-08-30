import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay integration.
 *
 * A frontend "payment successful" callback is never trusted. Access is granted
 * only after verifyPaymentSignature() succeeds against the key secret, or a
 * webhook verified with verifyWebhookSignature() reports payment captured.
 */

const API = 'https://api.razorpay.com/v1';

function auth(): string {
  const id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error('Razorpay keys are not configured.');
  return Buffer.from(`${id}:${secret}`).toString('base64');
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

export async function createOrder(opts: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: opts.amountPaise,
      currency: opts.currency,
      receipt: opts.receipt,
      notes: opts.notes ?? {},
      payment_capture: 1,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return (await res.json()) as RazorpayOrder;
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Checkout handler verification: HMAC of "order_id|payment_id". */
export function verifyPaymentSignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest('hex');
  return safeEqualHex(expected, opts.signature);
}

/** Webhook verification: HMAC of the exact raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
