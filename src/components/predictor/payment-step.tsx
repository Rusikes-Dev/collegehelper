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
  'Every matching college and branch, not just the first few',
  'Good chance, possible or reach on each one',
  'CAP Round I, II and III cutoffs side by side',
  'Come back any time with Restore my access',
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
 * Shown only when the predictor is in PAID mode and the visitor has no grant.
 *
 * The counts are already known at this point, so the offer is concrete: it
 * names how many colleges are waiting rather than asking for money against a
 * promise. Contact details are collected here because they are the only way to
 * restore access later, and the copy says exactly that.
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
        setError(order.error ?? 'The payment could not be started.');
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
        theme: { color: '#10346B' },
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
            setError('Payment cancelled. Nothing has been charged.');
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
    <div className="space-y-5 py-6">
      <div className="panel overflow-hidden">
        <div className="border-b border-line p-5">
          <p className="tnum text-4xl font-semibold leading-none text-ink">
            {summary.total}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            options match your score:{' '}
            <span className="font-semibold text-good">{summary.good} good chance</span>,{' '}
            <span className="font-semibold text-possible">{summary.possible} possible</span>,{' '}
            <span className="font-semibold text-reach">{summary.reach} reach</span>.
          </p>
        </div>
        <div className="p-5">
          <p className="tnum text-2xl font-semibold text-ink">{price}</p>
          <p className="text-sm text-ink-muted">one time, for this admission year</p>
          <ul className="mt-4 space-y-2">
            {INCLUDED.map((i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-muted">
                <Check size={16} className="mt-0.5 shrink-0 text-good" aria-hidden />
                {i}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        <div>
          <h2 className="text-[0.9375rem] font-semibold text-ink">Your details</h2>
          <p className="mt-1 hint">
            Your email and phone are how you get back into these results later. We do not
            use them for anything else.
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
              <Loader2 className="animate-spin" size={18} aria-hidden /> Opening payment
            </>
          ) : (
            <>Pay {price} and see my colleges</>
          )}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-faint">
          <ShieldCheck size={14} aria-hidden /> Paid through Razorpay. Every payment is
          verified on our server before access is given.
        </p>
      </div>

      <p className="text-sm text-ink-muted">
        Paid before?{' '}
        <Link href="/restore-access" className="font-semibold text-brand hover:underline">
          Restore my access
        </Link>
        .
      </p>
    </div>
  );
}
