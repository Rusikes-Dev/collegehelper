'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { SITE } from '@/lib/site';

/**
 * Route-level error boundary.
 *
 * The single most important line on this page is the one about money. A
 * student who hits a crash mid-checkout assumes the worst, and an error screen
 * that says only "something went wrong" turns a transient fault into a support
 * email or a chargeback. Saying plainly that access survives a crash, and how
 * to get it back, resolves most of them without a reply from you.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side crashes are already logged; this catches the client half.
    console.error('[error boundary]', error);
  }, [error]);

  return (
    <div className="wrap" style={{ paddingBlock: 'clamp(48px, 12vw, 88px)', maxWidth: 620 }}>
      <p className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--miss)', letterSpacing: '.06em' }}>
        SOMETHING BROKE
      </p>
      <h1 style={{ marginTop: 12, fontSize: 'clamp(1.6rem, 5vw, 2.2rem)' }}>This page didn&rsquo;t load</h1>
      <p style={{ marginTop: 14, color: 'var(--ink-2)' }}>
        An unexpected fault stopped the page rendering. It is usually temporary, so trying again is worth doing first.
      </p>

      <div className="panel" style={{ marginTop: 22, background: 'var(--safe-tint)', borderColor: 'var(--safe)' }}>
        <p style={{ fontWeight: 600, fontSize: 15 }}>If you have already paid, your access is safe</p>
        <p style={{ marginTop: 6, fontSize: 14.5, color: 'var(--ink-2)' }}>
          Payment is recorded against your email address and mobile number, not against this browser tab. Open{' '}
          <Link href="/restore">Restore access</Link> and enter the same pair you used at checkout.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
        <Link href="/find" className="btn btn-secondary">Start a new search</Link>
        <Link href="/restore" className="btn btn-secondary">Restore access</Link>
      </div>

      <p style={{ marginTop: 26, fontSize: 14, color: 'var(--muted)' }}>
        Still stuck? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        {error.digest && (
          <>
            {' '}and quote reference <span className="num">{error.digest}</span>, which tells us exactly which fault you hit.
          </>
        )}
      </p>
    </div>
  );
}
