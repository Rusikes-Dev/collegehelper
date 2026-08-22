import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'That page does not exist. Find your JEE college list, restore your access, or read how the tool works.',
  robots: { index: false, follow: true },
};

/**
 * A 404 that tries to finish the student's errand rather than just apologising.
 *
 * Most arrivals here are one of three people: someone who mistyped a URL,
 * someone following a stale link from a forum post, and — the one that costs
 * money — someone who has paid, lost their results, and is guessing at a URL.
 * The restore route is therefore given equal weight to the search route rather
 * than being buried in the footer.
 */

const ROUTES: [string, string, string][] = [
  ['/find', 'Find my colleges', 'Enter your rank and see what was within reach.'],
  ['/restore', 'Restore my access', 'Already paid? Get your list back with your email and mobile number.'],
  ['/how-it-works', 'How it works', 'What the tool compares, and what the result does and does not mean.'],
  ['/contact', 'Contact us', 'Something broken, or a payment gone wrong? Tell us.'],
];

export default function NotFound() {
  return (
    <div className="wrap" style={{ paddingBlock: 'clamp(48px, 12vw, 96px)', maxWidth: 660 }}>
      <p className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand)', letterSpacing: '.06em' }}>
        ERROR 404
      </p>
      <h1 style={{ marginTop: 12 }}>This page doesn&rsquo;t exist</h1>
      <p style={{ marginTop: 14, fontSize: '1.05rem', color: 'var(--ink-2)' }}>
        The link may be out of date, or the address may have a typo in it. Nothing is wrong with your account
        or your payment &mdash; if you have paid, your access is safe and can be restored below.
      </p>

      <div style={{ marginTop: 32, display: 'grid', gap: 12 }}>
        {ROUTES.map(([href, label, blurb]) => (
          <Link
            key={href}
            href={href}
            className="card"
            style={{ padding: 18, textDecoration: 'none', display: 'block', color: 'inherit' }}
          >
            <p style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--brand)' }}>{label} &rarr;</p>
            <p style={{ marginTop: 4, fontSize: 14.5, color: 'var(--ink-2)' }}>{blurb}</p>
          </Link>
        ))}
      </div>

      <p style={{ marginTop: 28, fontSize: 14.5 }}>
        Or go back to the <Link href="/">home page</Link>.
      </p>
    </div>
  );
}
