'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trackEvent } from './Analytics';

/**
 * One-screen checkout.
 *
 * Deliberately simpler than the paywall sheet: no result counts, no feature
 * list, no near-miss breakdown. Someone who lands here has already decided to
 * pay — usually from a link we sent them, or after a checkout that failed —
 * and every extra element between them and the button is a chance to lose
 * them a second time.
 *
 * It reuses the same three endpoints as the paywall (`/api/account`,
 * `/api/payment/order`, `/api/payment/verify`), so there is one payment path
 * in the product rather than two that can drift apart.
 */

type Phase = 'BOOT' | 'IDLE' | 'SAVING' | 'OPENING' | 'VERIFYING' | 'DONE' | 'ERROR';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PayForm({ price, paymentsEnabled }: { price: string; paymentsEnabled: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('BOOT');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [alreadyHad, setAlreadyHad] = useState(false);

  /* A session must exist before an order can be created. Someone arriving
     from a shared link has none, so one is opened on mount. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetch('/api/session/start', { method: 'POST' });
      } catch {
        /* The order call will surface any real problem with a better message. */
      }
      if (!cancelled) setPhase('IDLE');
    })();
    return () => { cancelled = true; };
  }, []);

  /* Reuse details from an earlier attempt in this tab, so a student who has
     already failed once does not retype an email address on a phone. */
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('jcf_contact') ?? '{}');
      if (saved.email) setEmail(saved.email);
      if (saved.phone) setPhone(saved.phone);
      if (saved.name) setName(saved.name);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (phase !== 'DONE') return;
    const t = setTimeout(() => router.push('/thank-you'), 1100);
    return () => clearTimeout(t);
  }, [phase, router]);

  async function payNow() {
    setError(null);
    setFields({});
    setPhase('SAVING');

    try {
      const accountRes = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });
      const account = await accountRes.json();

      if (!accountRes.ok) {
        if (account.fields) {
          setFields(account.fields);
          setPhase('IDLE');
          setTimeout(() => document.querySelector<HTMLElement>('[data-pay][aria-invalid="true"]')?.focus(), 0);
          return;
        }
        throw new Error(account.error ?? 'We could not save your details.');
      }

      try { sessionStorage.setItem('jcf_contact', JSON.stringify({ name, email, phone })); } catch { /* ignore */ }

      // Someone who already bought must not be charged again.
      if (account.unlocked) { setAlreadyHad(true); setPhase('DONE'); return; }

      setPhase('OPENING');
      const orderRes = await fetch('/api/payment/order', { method: 'POST' });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? 'Could not start the payment.');
      if (order.alreadyPaid) { setAlreadyHad(true); setPhase('DONE'); return; }

      if (!(await loadRazorpay())) {
        throw new Error('The payment window could not load. Check your connection and try again.');
      }

      trackEvent('payment_window_opened', { source: 'pay_page' });

      const rzp = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'JEE College Finder',
        description: 'Personalised college list',
        theme: { color: '#1D4ED8' },
        prefill: order.prefill ?? { name, email, contact: phone },
        notes: { email },
        modal: {
          ondismiss: () => {
            setPhase('IDLE');
            trackEvent('payment_cancelled', { source: 'pay_page' });
            setError('Payment was cancelled. You have not been charged \u2014 you can try again whenever you are ready.');
          },
        },
        handler: async (response: Record<string, string>) => {
          setPhase('VERIFYING');
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verify = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verify.error ?? 'We could not verify the payment.');
            trackEvent('payment_succeeded', { source: 'pay_page' });
            setPhase('DONE');
          } catch (e) {
            setPhase('ERROR');
            setError(
              (e instanceof Error ? e.message : 'We could not verify the payment.') +
              ' If money was deducted, open the Restore access page and enter the same email and mobile number \u2014 your access will be waiting.',
            );
          }
        },
      });

      rzp.on('payment.failed', (resp: unknown) => {
        const r = resp as { error?: { description?: string } };
        setPhase('ERROR');
        trackEvent('payment_failed', { source: 'pay_page' });
        setError(r?.error?.description ?? 'The payment did not go through. No money has been taken.');
      });

      rzp.open();
    } catch (e) {
      setPhase('ERROR');
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    }
  }

  if (phase === 'BOOT') {
    return (
      <div style={{ marginTop: 26, display: 'grid', gap: 16 }} aria-busy="true">
        <span className="sr-only">Preparing checkout&hellip;</span>
        {[76, 76, 76, 52].map((h, i) => <div key={i} className="skeleton" style={{ height: h }} />)}
      </div>
    );
  }

  if (phase === 'DONE') {
    return (
      <div className="panel" style={{ marginTop: 26, background: 'var(--safe-tint)', borderColor: 'var(--safe)', textAlign: 'center' }}>
        <div aria-hidden className="tick">&#10003;</div>
        <h2 style={{ fontSize: 18, marginTop: 12 }}>
          {alreadyHad ? 'You already have access' : 'Payment successful'}
        </h2>
        <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--ink-2)' }} role="status">
          {alreadyHad
            ? 'These details already have live access, so we have not charged you again. Taking you through\u2026'
            : 'Taking you to your next steps\u2026'}
        </p>
      </div>
    );
  }

  const busy = phase === 'SAVING' || phase === 'OPENING' || phase === 'VERIFYING';
  const label =
    phase === 'SAVING' ? 'Saving your details\u2026'
    : phase === 'OPENING' ? 'Opening payment\u2026'
    : phase === 'VERIFYING' ? 'Confirming payment\u2026'
    : `Pay ${price} securely`;

  const field = (
    id: 'name' | 'email' | 'phone',
    labelText: string,
    value: string,
    set: (v: string) => void,
    extra: React.InputHTMLAttributes<HTMLInputElement>,
    hint?: string,
  ) => (
    <div className="field">
      <label className="label" htmlFor={`pay-${id}`}>
        {labelText}
        {id === 'name' && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> (optional)</span>}
      </label>
      <input
        {...extra}
        id={`pay-${id}`}
        data-pay
        className="input"
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={Boolean(fields[id])}
        aria-describedby={fields[id] ? `pay-${id}-err` : hint ? `pay-${id}-hint` : undefined}
        disabled={busy}
      />
      {fields[id] && <p className="error" id={`pay-${id}-err`} role="alert"><span aria-hidden>!</span>{fields[id]}</p>}
      {!fields[id] && hint && <p className="hint" id={`pay-${id}-hint`}>{hint}</p>}
    </div>
  );

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        {field('name', 'Name', name, setName, {
          type: 'text', autoComplete: 'name', enterKeyHint: 'next', placeholder: 'Aarav Sharma',
        })}
        {field('email', 'Email address', email, setEmail, {
          type: 'email', inputMode: 'email', autoComplete: 'email', autoCapitalize: 'none',
          autoCorrect: 'off', spellCheck: false, enterKeyHint: 'next', placeholder: 'you@example.com',
        }, 'Check this carefully \u2014 it is half of how you get back in later.')}
        {field('phone', 'Mobile number', phone, setPhone, {
          type: 'tel', inputMode: 'numeric', autoComplete: 'tel', enterKeyHint: 'go',
          placeholder: '98765 43210', maxLength: 17,
        }, 'Indian mobile number, with or without +91.')}
      </div>

      {error && <p className="error" style={{ marginTop: 16 }} role="alert"><span aria-hidden>!</span>{error}</p>}

      {!paymentsEnabled && (
        <p className="error" style={{ marginTop: 16 }} role="alert">
          <span aria-hidden>!</span>Payments are not configured on this deployment yet.
        </p>
      )}

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 20, fontSize: 16, padding: '15px 24px' }}
        onClick={payNow}
        disabled={busy || !paymentsEnabled || !email || !phone}
      >
        {label}
      </button>

      <p style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        Card, UPI, net banking and wallets, handled by Razorpay. Your card and UPI details are entered on
        Razorpay&rsquo;s systems and never reach our servers.
      </p>
      <p style={{ marginTop: 10, fontSize: 13.5, textAlign: 'center' }}>
        Already paid? <Link href="/restore">Restore your access</Link>
      </p>
    </div>
  );
}
