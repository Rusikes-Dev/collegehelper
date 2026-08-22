import type { Metadata } from 'next';
import Link from 'next/link';
import PayForm from '@/components/PayForm';
import { PRICE_LABEL, paymentsConfigured } from '@/lib/razorpay';
import { readSession, hasAccess } from '@/lib/session';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `Pay ${PRICE_LABEL} \u2014 unlock your college list`,
  description: `A single ${PRICE_LABEL} payment unlocks your personalised JEE college list, with unlimited searches and access on any device. Card, UPI, net banking or wallet.`,
  alternates: { canonical: '/pay' },
  // Indexable: it is a legitimate landing page for a direct payment link, and
  // Razorpay's review process likes to see a reachable checkout page.
  robots: { index: true, follow: true },
};

export const dynamic = 'force-dynamic';

const INCLUDED = [
  'Every institute and programme within reach of your rank, by name',
  'Opening rank, closing rank and your margin on each row',
  'Search, filter and sort the full list',
  'A choice list you can reorder, and a PDF to take to counselling',
  'Unlimited re-runs \u2014 one payment, not one search',
  'Access on any device with the same email and mobile number',
];

/**
 * Standalone checkout.
 *
 * Exists so a payment link can be sent directly — to a student whose checkout
 * failed, or from a message rather than the site. It works before any search
 * has been run, because access attaches to the person, not to a search.
 */
export default async function PayPage() {
  const session = await readSession();
  const unlocked = await hasAccess(session);

  if (unlocked) {
    return (
      <div className="wrap" style={{ paddingBlock: 'clamp(32px, 8vw, 64px)', maxWidth: 560 }}>
        <div className="panel" style={{ background: 'var(--safe-tint)', borderColor: 'var(--safe)', textAlign: 'center' }}>
          <div aria-hidden className="tick">&#10003;</div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4.6vw, 1.8rem)', marginTop: 14 }}>You already have access</h1>
          <p style={{ marginTop: 10, fontSize: 15, color: 'var(--ink-2)' }}>
            There is nothing to pay. Your access is live, and re-running a search costs nothing.
          </p>
          <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
            <Link href="/find" className="btn btn-primary btn-block">Find my colleges</Link>
            <Link href="/results" className="btn btn-secondary btn-block">Open my last list</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingBlock: 'clamp(28px, 7vw, 56px)', maxWidth: 560 }}>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.1rem)' }}>Unlock your college list</h1>
      <p style={{ marginTop: 12, color: 'var(--ink-2)' }}>
        One payment of <strong className="num">{PRICE_LABEL}</strong>. No subscription, no renewal, nothing to cancel.
      </p>

      <div className="panel" style={{ marginTop: 22, background: 'var(--brand-tint)', borderColor: 'var(--brand)' }}>
        <p className="num" style={{ fontSize: 34, fontWeight: 600, color: 'var(--brand-dark)', lineHeight: 1.1 }}>
          {PRICE_LABEL}
        </p>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>one time, includes everything below</p>
        <ul className="tick-list">
          {INCLUDED.map((f) => <li key={f}><span aria-hidden>&#10003;</span>{f}</li>)}
        </ul>
      </div>

      <PayForm price={PRICE_LABEL} paymentsEnabled={paymentsConfigured()} />

      <div className="panel" style={{ marginTop: 30 }}>
        <h2 style={{ fontSize: 15.5 }}>Haven&rsquo;t run a search yet?</h2>
        <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--ink-2)' }}>
          That is fine &mdash; access belongs to you, not to one search, so you can pay now and enter your rank
          afterwards. If you would rather see how many matches exist before paying, that count is free on the{' '}
          <Link href="/find">search page</Link>.
        </p>
      </div>

      <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)' }}>
        By paying you accept our <Link href="/terms">terms</Link>, <Link href="/refunds">refund policy</Link> and{' '}
        <Link href="/privacy">privacy policy</Link>. Cutoffs are previous-year JoSAA figures and do not guarantee
        admission. Questions before paying? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </div>
  );
}
