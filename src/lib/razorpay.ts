import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay integration. The key secret is used only here, on the server, and is
 * never sent to the browser. The browser receives the key *id* and order id,
 * which are safe to expose.
 */

export const PRICE_PAISE = Number(process.env.PRICE_PAISE ?? 4900); // Rs 49.00
export const PRICE_LABEL = `\u20b9${(PRICE_PAISE / 100).toFixed(0)}`;

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw Object.assign(
      new Error('Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'),
      { status: 503, code: 'PAYMENTS_UNCONFIGURED' },
    );
  }
  return { keyId, keySecret };
}

export function paymentsConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export async function createOrder(receipt: string, notes: Record<string, string> = {}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: PRICE_PAISE,
      currency: 'INR',
      receipt,
      notes,
      payment_capture: 1,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[razorpay] order creation failed', res.status, detail);
    throw Object.assign(new Error('Could not start the payment. Please try again.'), { status: 502, code: 'ORDER_FAILED' });
  }
  return (await res.json()) as RazorpayOrder;
}

/** HMAC-SHA256 of "<order_id>|<payment_id>" keyed with the secret. */
export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const { keySecret } = credentials();
  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook signatures are HMAC-SHA256 over the *raw* request body, keyed with
 * the webhook secret — a different secret from the API key secret. The body
 * must not be parsed and re-serialised before this runs, or the digest changes.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function webhooksConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

/**
 * Second, independent check: ask Razorpay what it thinks the payment is.
 * Guards against a leaked signature and confirms the amount actually charged.
 */
export async function fetchPayment(paymentId: string): Promise<{ status: string; amount: number; order_id: string }> {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    throw Object.assign(new Error('Could not confirm the payment with Razorpay.'), { status: 502, code: 'VERIFY_FAILED' });
  }
  return (await res.json()) as { status: string; amount: number; order_id: string };
}
