'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const INCLUDED = [
  'Your full list of matching colleges and branches',
  'Good chance / possible / reach for every option',
  'Filters by branch, city, CAP round and category',
  'CAP Round I, II and III cutoff data',
  'Return any time with Restore my access',
];

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * Step 6. Contact details are collected before payment because they are the
 * only way to restore access later; the copy says exactly that rather than
 * asking for them without explanation.
 */
export function PaymentStep({
  pricePaise,
  summary,
  onUnlocked,
}: {
  pricePaise: number;
  summary: { total: number; good: number; possible: number; reach: number };
  onUnlocked: () => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = `\u20B9${(pricePaise / 100).toLocaleString('en-IN')}`;

  const ready =
    form.name.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(form.email) &&
    /^(?:\+?91|0)?[6-9]\d{9}$/.test(form.phone.replace(/[\s\-()]/g, ''));

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const order = await res.json();
      if (!res.ok) {
        setError(order.error ?? 'We could not start the payment.');
        return;
      }
      // Already paid earlier: let them straight through, do not charge again.
      if (order.alreadyHasAccess) return onUnlocked();

      if (!(await loadCheckout())) {
        setError('The payment window could not load. Check your connection and try again.');
        return;
      }

      const rzp = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'CollegeHelper',
        description: 'MHT-CET College Predictor',
        prefill: order.prefill,
        theme: { color: '#143C8C' },
        handler: async (response: Record<string, string>) => {
          // Never trusted on its own: the server re-verifies the signature.
          const verify = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });
          if (verify.ok) {
            onUnlocked();
          } else {
            const j = await verify.json().catch(() => ({}));
            setError(
              j.error ??
                'Your payment went through but we could not confirm it here. ' +
                  'Use Restore my access in a minute, or contact us.',
            );
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError('Payment was cancelled. Nothing has been charged.');
          },
        },
      });
      rzp.open();
    } catch {
      setError('Something went wrong starting the payment. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-display text-xl font-semibold text-ink">
          MHT-CET College Predictor
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          We found{' '}
          <span className="tnum font-medium text-ink">{summary.total}</span> matching
          options for you \u2014 {summary.good} good chance, {summary.possible} possible,{' '}
          {summary.reach} reach.
        </p>
        <p className="tnum mt-4 text-3xl font-medium text-ink">{price}</p>
        <ul className="mt-4 space-y-2">
          {INCLUDED.map((i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-muted">
              <Check size={16} className="mt-0.5 shrink-0 text-good" aria-hidden />
              {i}
            </li>
          ))}
        </ul>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <h3 className="font-medium text-ink">Your details</h3>
          <p className="mt-1 text-sm text-ink-muted">
            We need your email and phone so you can get back into your results later
            with Restore my access. We do not use them for anything else.
          </p>
        </div>

        <Field label="Full name" htmlFor="name">
          <Input
            id="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Phone number" hint="10-digit Indian mobile number." htmlFor="phone">
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="tnum"
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-card bg-reach-tint px-4 py-3 text-sm text-reach">
            {error}
          </p>
        )}

        <Button size="lg" className="w-full" onClick={pay} disabled={!ready || busy}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" size={18} /> Opening payment
            </>
          ) : (
            <>Pay {price} and see my results</>
          )}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-faint">
          <ShieldCheck size={14} aria-hidden /> Payment handled by Razorpay. Every payment
          is verified on our server before access is given.
        </p>
      </div>

      <p className="text-sm text-ink-muted">
        Paid before?{' '}
        <Link href="/restore-access" className="font-medium text-brand hover:underline">
          Restore my access
        </Link>
        .
      </p>
    </div>
  );
}
