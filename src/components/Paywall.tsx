'use client';

import { useEffect, useState } from 'react';
import Sheet from './Sheet';

export interface SearchSummary {
  summary: { eligible: number; nearMisses: number; institutes: number; programs: number; byType: Record<string, number> };
  unevaluated: { reason: string; count: number; message: string; action: string }[];
  ranksUsed: string[];
  coverage: { years: number[]; rounds: number[] };
}

type Phase = 'IDLE' | 'OPENING' | 'VERIFYING' | 'DONE' | 'ERROR';

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }
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
 */
export default function Paywall({
  summary, pricePaise, paymentsEnabled, onClose, onUnlocked,
}: {
  summary: SearchSummary;
  pricePaise: number;
  paymentsEnabled: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const price = `\u20b9${(pricePaise / 100).toFixed(0)}`;
  const { eligible, nearMisses, institutes, byType } = summary.summary;

  useEffect(() => { if (phase === 'DONE') { const t = setTimeout(onUnlocked, 900); return () => clearTimeout(t); } }, [phase, onUnlocked]);

  async function pay() {
    setError(null);
    setPhase('OPENING');
    try {
      const orderRes = await fetch('/api/payment/order', { method: 'POST' });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? 'Could not start the payment.');
      if (order.alreadyPaid) { setPhase('DONE'); return; }

      if (!(await loadRazorpay())) throw new Error('The payment window could not load. Check your connection and try again.');

      const rzp = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'JEE College Finder',
        description: 'Personalised college list',
        theme: { color: '#1D4ED8' },
        modal: {
          ondismiss: () => {
            setPhase('IDLE');
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
            setPhase('DONE');
          } catch (e) {
            setPhase('ERROR');
            setError(e instanceof Error ? e.message : 'We could not verify the payment.');
          }
        },
      });

      rzp.on('payment.failed', (resp: unknown) => {
        const r = resp as { error?: { description?: string } };
        setPhase('ERROR');
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
      <Sheet title="Payment successful" onClose={() => {}}>
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <div aria-hidden style={{ width: 52, height: 52, borderRadius: 999, background: 'var(--safe-tint)', color: 'var(--safe)', display: 'grid', placeItems: 'center', fontSize: 26, margin: '0 auto 16px' }}>&#10003;</div>
          <h3>Payment successful</h3>
          <p style={{ marginTop: 8, color: 'var(--ink-2)' }} role="status">Finding your colleges&hellip;</p>
        </div>
      </Sheet>
    );
  }

  const busy = phase === 'OPENING' || phase === 'VERIFYING';

  return (
    <Sheet
      title="Unlock your personalised college list"
      onClose={busy ? () => {} : onClose}
      footer={
        <button className="btn btn-primary btn-block" onClick={pay} disabled={busy || !paymentsEnabled}>
          {phase === 'OPENING' ? 'Opening payment\u2026' : phase === 'VERIFYING' ? 'Verifying payment\u2026' : `Pay ${price} & find colleges`}
        </button>
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
            <p className="num" style={{ fontSize: 34, fontWeight: 600, color: 'var(--brand-dark)', lineHeight: 1.1 }}>{eligible.toLocaleString('en-IN')}</p>
            <p style={{ fontSize: 14.5, color: 'var(--ink-2)', marginTop: 4 }}>
              programmes across {institutes} institute{institutes === 1 ? '' : 's'} had closing ranks within your reach
            </p>
            <div className="chips" style={{ justifyContent: 'center', marginTop: 12 }}>
              {Object.entries(byType).map(([t, n]) => (
                <span key={t} className="badge">{t} &middot; {n}</span>
              ))}
            </div>
          </div>

          <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gap: 10 }}>
            {[
              'Every matching institute and programme by name',
              'Opening rank, closing rank and your margin for each',
              'Search, filter and sort the whole list',
              'Build and reorder your choice list',
              'Download it as a PDF',
              ...(nearMisses > 0 ? [`${nearMisses} near-miss option${nearMisses === 1 ? '' : 's'} just outside your rank`] : []),
            ].map((f) => (
              <li key={f} style={{ display: 'flex', gap: 10, fontSize: 14.5 }}>
                <span aria-hidden style={{ color: 'var(--safe)', fontWeight: 700 }}>&#10003;</span>{f}
              </li>
            ))}
          </ul>

          {summary.unevaluated.length > 0 && (
            <div className="panel" style={{ marginTop: 18 }}>
              <p style={{ fontWeight: 600, fontSize: 14.5 }}>Before you pay, note:</p>
              {summary.unevaluated.map((u) => (
                <p key={u.reason} style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>
                  <strong>{u.count.toLocaleString('en-IN')} seats not included.</strong> {u.message} {u.action}
                </p>
              ))}
            </div>
          )}

          <p style={{ marginTop: 18, fontSize: 13, color: 'var(--muted)' }}>
            {price} one-time payment through Razorpay. No account, no subscription. Results stay available on this device for seven days.
            Cutoffs are previous-year figures and do not guarantee admission.
          </p>
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
