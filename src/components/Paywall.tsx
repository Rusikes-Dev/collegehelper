'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Sheet from './Sheet';
import { trackEvent } from './Analytics';

export interface SearchSummary {
  summary: { eligible: number; nearMisses: number; institutes: number; programs: number; byType: Record<string, number> };
  unevaluated: { reason: string; count: number; message: string; action: string }[];
  ranksUsed: string[];
  coverage: { years: number[]; rounds: number[] };
}

type Phase = 'IDLE' | 'SAVING' | 'OPENING' | 'VERIFYING' | 'DONE' | 'ERROR';

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

/**
 * Payment gate.
 *
 * The counts shown here are free: the student can see the search worked and
 * how much is behind it before paying. No institute or programme names appear
 * until the server has verified the payment.
 *
 * The email address and mobile number are taken on this screen rather than
 * after payment, for three reasons: they are what the student will use to get
 * their list back on another device; they let the server recognise someone who
 * has already paid and wave them through; and they mean a payment that
 * completes after the browser has given up can still be matched to a person.
 */
export default function Paywall({
  summary, pricePaise, paymentsEnabled, restoreEnabled, onClose, onUnlocked,
}: {
  summary: SearchSummary;
  pricePaise: number;
  paymentsEnabled: boolean;
  restoreEnabled: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const price = `\u20b9${(pricePaise / 100).toFixed(0)}`;
  const { eligible, nearMisses, institutes, byType } = summary.summary;
  const contactRef = useRef<HTMLInputElement>(null);

  useEffect(() => { trackEvent('paywall_view', { eligible }); }, [eligible]);
  useEffect(() => {
    if (phase === 'DONE') { const t = setTimeout(onUnlocked, 900); return () => clearTimeout(t); }
  }, [phase, onUnlocked]);

  /* Restores the details on a second attempt so a failed payment does not
     mean typing an email address on a phone all over again. */
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('jcf_contact') ?? '{}');
      if (saved.email) setEmail(saved.email);
      if (saved.phone) setPhone(saved.phone);
      if (saved.name) setName(saved.name);
    } catch { /* ignore */ }
  }, []);

  function remember() {
    try { sessionStorage.setItem('jcf_contact', JSON.stringify({ name, email, phone })); } catch { /* ignore */ }
  }

  /** Saves the contact details. Returns true when the student already has access. */
  async function saveContact(): Promise<boolean | null> {
    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.fields) {
        setFields(data.fields);
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>('[data-contact][aria-invalid="true"]');
          el?.focus();
        }, 0);
        setPhase('IDLE');
        return null;
      }
      throw new Error(data.error ?? 'We could not save your details.');
    }

    setFields({});
    remember();
    return Boolean(data.unlocked);
  }

  async function payNow() {
    setError(null);
    setNote(null);
    setFields({});
    setPhase('SAVING');

    try {
      const already = await saveContact();
      if (already === null) return;               // validation errors are on screen
      if (already) { setNote('You already have access with these details.'); setPhase('DONE'); return; }

      setPhase('OPENING');
      const orderRes = await fetch('/api/payment/order', { method: 'POST' });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? 'Could not start the payment.');
      if (order.alreadyPaid) { setPhase('DONE'); return; }

      if (!(await loadRazorpay())) {
        throw new Error('The payment window could not load. Check your connection and try again.');
      }

      trackEvent('payment_window_opened');

      const rzp = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'JEE College Finder',
        description: 'Personalised college list',
        theme: { color: '#1D4ED8' },
        // Prefilled from what was just entered, so UPI and OTP screens do not
        // ask a student on a phone to type the same things a third time.
        prefill: order.prefill ?? { name, email, contact: phone },
        notes: { email },
        modal: {
          ondismiss: () => {
            setPhase('IDLE');
            trackEvent('payment_cancelled');
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
            trackEvent('payment_succeeded');
            setPhase('DONE');
          } catch (e) {
            setPhase('ERROR');
            setError(
              (e instanceof Error ? e.message : 'We could not verify the payment.') +
              ' If money was deducted, open the Restore access page and enter the same email and mobile number \u2014 your list will be waiting.',
            );
          }
        },
      });

      rzp.on('payment.failed', (resp: unknown) => {
        const r = resp as { error?: { description?: string } };
        setPhase('ERROR');
        trackEvent('payment_failed');
        setError(r?.error?.description ?? 'The payment did not go through. No money has been taken.');
      });

      rzp.open();
    } catch (e) {
      setPhase('ERROR');
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    }
  }

  if (phase === 'DONE') {
    return (
      <Sheet title="You're in" onClose={() => {}}>
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <div aria-hidden className="tick">&#10003;</div>
          <h3>{note ? 'Access confirmed' : 'Payment successful'}</h3>
          <p style={{ marginTop: 8, color: 'var(--ink-2)' }} role="status">
            {note ?? 'Finding your colleges\u2026'}
          </p>
        </div>
      </Sheet>
    );
  }

  const busy = phase === 'SAVING' || phase === 'OPENING' || phase === 'VERIFYING';
  const buttonLabel =
    phase === 'SAVING' ? 'Saving your details\u2026'
    : phase === 'OPENING' ? 'Opening payment\u2026'
    : phase === 'VERIFYING' ? 'Confirming payment\u2026'
    : `Pay ${price} & see my list`;

  const field = (
    id: 'name' | 'email' | 'phone',
    label: string,
    value: string,
    set: (v: string) => void,
    extra: React.InputHTMLAttributes<HTMLInputElement>,
    hint?: string,
  ) => (
    <div className="field">
      <label className="label" htmlFor={`c-${id}`}>
        {label}{id === 'name' && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> (optional)</span>}
      </label>
      <input
        {...extra}
        id={`c-${id}`}
        data-contact
        ref={id === 'email' ? contactRef : undefined}
        className="input"
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={Boolean(fields[id])}
        aria-describedby={fields[id] ? `c-${id}-err` : hint ? `c-${id}-hint` : undefined}
        disabled={busy}
      />
      {fields[id] && <p className="error" id={`c-${id}-err`} role="alert"><span aria-hidden>!</span>{fields[id]}</p>}
      {!fields[id] && hint && <p className="hint" id={`c-${id}-hint`}>{hint}</p>}
    </div>
  );

  return (
    <Sheet
      title="Unlock your personalised college list"
      onClose={busy ? () => {} : onClose}
      footer={
        eligible === 0 ? (
          <button className="btn btn-secondary btn-block" onClick={onClose}>Change my search</button>
        ) : (
          <button className="btn btn-primary btn-block" onClick={payNow} disabled={busy || !paymentsEnabled}>
            {buttonLabel}
          </button>
        )
      }
    >
      {eligible === 0 ? (
        <div className="panel" style={{ background: 'var(--border-tint)', borderColor: 'var(--border-line)' }}>
          <h3 style={{ fontSize: 16 }}>No matches at these settings</h3>
          <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--ink-2)' }}>
            We found nothing within last year&rsquo;s closing ranks for this combination, so there is nothing to charge you for.
            Try selecting all institute types and all programmes, or check that your rank was entered correctly.
          </p>
          {nearMisses > 0 && (
            <p style={{ marginTop: 10, fontSize: 14.5, color: 'var(--ink-2)' }}>
              {nearMisses} option{nearMisses === 1 ? '' : 's'} came close to your rank without meeting last year&rsquo;s cutoff.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="panel" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand)', textAlign: 'center' }}>
            <p className="num" style={{ fontSize: 34, fontWeight: 600, color: 'var(--brand-dark)', lineHeight: 1.1 }}>
              {eligible.toLocaleString('en-IN')}
            </p>
            <p style={{ fontSize: 14.5, color: 'var(--ink-2)', marginTop: 4 }}>
              programmes across {institutes} institute{institutes === 1 ? '' : 's'} had closing ranks within your reach
            </p>
            <div className="chips" style={{ justifyContent: 'center', marginTop: 12 }}>
              {Object.entries(byType).map(([t, n]) => (
                <span key={t} className="badge">{t} &middot; {n}</span>
              ))}
            </div>
          </div>

          <ul className="tick-list">
            {[
              'Every matching institute and programme by name',
              'Opening rank, closing rank and your margin for each',
              'Search, filter and sort the whole list',
              'Build and reorder your choice list, then download the PDF',
              'Re-run the search as often as you like \u2014 one payment, not one search',
              ...(nearMisses > 0 ? [`${nearMisses} near-miss option${nearMisses === 1 ? '' : 's'} just outside your rank`] : []),
            ].map((f) => (
              <li key={f}><span aria-hidden>&#10003;</span>{f}</li>
            ))}
          </ul>

          {/* ---- contact ---- */}
          <div className="panel" style={{ marginTop: 20, display: 'grid', gap: 14 }}>
            <div>
              <h3 style={{ fontSize: 15.5 }}>Where should we attach your access?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 6 }}>
                Enter the same email and mobile number any time to get this list back &mdash; on a new phone, a new browser,
                or after clearing your history.
              </p>
            </div>

            {field('name', 'Name', name, setName, {
              type: 'text', autoComplete: 'name', enterKeyHint: 'next', placeholder: 'Aarav Sharma',
            })}
            {field('email', 'Email address', email, setEmail, {
              type: 'email', inputMode: 'email', autoComplete: 'email', autoCapitalize: 'none',
              autoCorrect: 'off', spellCheck: false, enterKeyHint: 'next', placeholder: 'you@example.com',
            }, 'Double-check this. It is half of how you get back in.')}
            {field('phone', 'Mobile number', phone, setPhone, {
              type: 'tel', inputMode: 'numeric', autoComplete: 'tel', enterKeyHint: 'go',
              placeholder: '98765 43210', maxLength: 17,
            }, 'Indian mobile number, with or without +91.')}
          </div>

          {summary.unevaluated.length > 0 && (
            <div className="panel" style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 14.5 }}>Before you pay, note:</p>
              {summary.unevaluated.map((u) => (
                <p key={u.reason} style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>
                  <strong>{u.count.toLocaleString('en-IN')} seats not included.</strong> {u.message} {u.action}
                </p>
              ))}
            </div>
          )}

          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
            {price} one-time payment through Razorpay. No account or password. We use your email and mobile number to
            restore your access and to contact you about this purchase &mdash; nothing else.{' '}
            <Link href="/privacy">Privacy policy</Link>. Cutoffs are previous-year figures and do not guarantee admission.
          </p>

          {restoreEnabled && (
            <p style={{ marginTop: 12, fontSize: 13.5, textAlign: 'center' }}>
              Already paid? <Link href="/restore">Restore your access</Link>
            </p>
          )}
        </>
      )}

      {!paymentsEnabled && (
        <p className="error" style={{ marginTop: 14 }} role="alert">
          <span aria-hidden>!</span>Payments are not configured on this deployment yet.
        </p>
      )}
      {error && <p className="error" style={{ marginTop: 14 }} role="alert"><span aria-hidden>!</span>{error}</p>}
    </Sheet>
  );
}
