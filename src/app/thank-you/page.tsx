import type { Metadata } from 'next';
import Link from 'next/link';
import { readSession, hasAccess } from '@/lib/session';
import { SITE } from '@/lib/site';
import ThankYouTracker from '@/components/ThankYouTracker';

export const metadata: Metadata = {
  title: 'Payment successful \u2014 thank you',
  description:
    'Your payment went through and your JEE college list is ready. Here is how to open it, and how to get it back on another device.',
  // A confirmation page has no business in search results, and indexing it
  // would put a "payment successful" page in front of people who have not paid.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Post-payment confirmation.
 *
 * The Razorpay flow already drops a student straight into `/results`, so this
 * page is not on the happy path — it is the page for everyone the happy path
 * dropped. UPI apps switch away from the browser and often do not come back,
 * and when that happens the webhook grants access with no browser involved.
 * Those students need somewhere to land that tells them, in order: you paid,
 * here is your list, and here is how to find it again tomorrow.
 *
 * The one thing it must never do is imply access when there is none, so it
 * checks the real grant rather than assuming a visit here means success.
 */
export default async function ThankYouPage() {
  const session = await readSession();
  const unlocked = await hasAccess(session);
  const name = session?.name ?? null;

  return (
    <div className="wrap" style={{ paddingBlock: 'clamp(32px, 8vw, 64px)', maxWidth: 620 }}>
      <ThankYouTracker unlocked={unlocked} />

      <div style={{ textAlign: 'center' }}>
        <div aria-hidden className="tick">&#10003;</div>
        <h1 style={{ marginTop: 16, fontSize: 'clamp(1.6rem, 5.4vw, 2.3rem)' }}>
          {unlocked ? 'You&rsquo;re all set' : 'Thank you'}
        </h1>
        <p style={{ marginTop: 12, fontSize: '1.05rem', color: 'var(--ink-2)' }}>
          {unlocked
            ? `${name ? `Thanks, ${name}. ` : ''}Your payment is confirmed and your college list is unlocked.`
            : 'If your payment has just gone through it can take up to a minute to settle. Restore your access below and your list will be waiting.'}
        </p>
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 30 }}>
        {unlocked ? (
          <>
            <Link href="/results" className="btn btn-primary btn-block" style={{ fontSize: 16, padding: '14px 24px' }}>
              Open my college list
            </Link>
            <Link href="/find" className="btn btn-secondary btn-block">Run another search &mdash; no extra charge</Link>
          </>
        ) : (
          <>
            <Link href="/restore" className="btn btn-primary btn-block" style={{ fontSize: 16, padding: '14px 24px' }}>
              Restore my access
            </Link>
            <Link href="/find" className="btn btn-secondary btn-block">Back to the search form</Link>
          </>
        )}
      </div>

      {/* The part students actually need tomorrow, not today. */}
      <div className="panel" style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16 }}>Keep this in mind for later</h2>
        <ul style={{ margin: '12px 0 0', paddingLeft: 20, display: 'grid', gap: 9, fontSize: 14.5, color: 'var(--ink-2)' }}>
          <li>
            <strong>Your access follows you, not this phone.</strong> Open{' '}
            <Link href="/restore">Restore access</Link> on any device and enter the same email address and
            mobile number you used at checkout.
          </li>
          <li>
            <strong>Re-running is free.</strong> Change a branch, add your JEE Advanced rank, switch the
            counselling round &mdash; none of it costs anything more.
          </li>
          <li>
            <strong>Export before you fill choices.</strong> Build your choice list in the order you want and
            download the PDF, so you are not rebuilding it against the clock on the JoSAA portal.
          </li>
        </ul>
      </div>

      <div className="panel" style={{ marginTop: 16, background: 'var(--border-tint)', borderColor: 'var(--border-line)' }}>
        <h2 style={{ fontSize: 15.5 }}>Money taken but nothing unlocked?</h2>
        <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--ink-2)' }}>
          Try <Link href="/restore">Restore access</Link> first &mdash; it resolves almost every case, including
          payments that completed after the browser closed. If it still will not let you in, email{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with the date, the amount and the Razorpay
          reference from your receipt, and we will sort it out by hand.
        </p>
      </div>

      <p style={{ marginTop: 26, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        Cutoffs are previous-year JoSAA figures shown for guidance. They do not guarantee admission.{' '}
        <Link href="/refunds">Refund policy</Link>.
      </p>
    </div>
  );
}
