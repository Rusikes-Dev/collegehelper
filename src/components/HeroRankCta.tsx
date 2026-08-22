'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trackEvent } from './Analytics';

/**
 * The above-the-fold call to action.
 *
 * A plain "Find my colleges" button asks the visitor to trust the site before
 * it has shown them anything. One rank field asks for the thing they already
 * have to hand and came here to use, which is a much smaller step — and it
 * carries the value straight into the search form, so the first field on
 * `/find` arrives already filled.
 *
 * The rank is passed in the URL, which is deliberate and safe: it is the
 * student's own number travelling between two pages of their own session, it
 * is never logged against a name, and `/find` is excluded from analytics
 * query capture. Nothing sensitive is being put somewhere new.
 */
export default function HeroRankCta({ price }: { price: string }) {
  const router = useRouter();
  const [rank, setRank] = useState('');
  const [error, setError] = useState<string | null>(null);

  const digits = rank.replace(/\D/g, '');
  const pretty = digits ? Number(digits).toLocaleString('en-IN') : '';

  function go(e: React.FormEvent) {
    e.preventDefault();

    // Validated here only to save a wasted page load. The real check is the
    // Zod schema on the server, which this cannot bypass.
    if (!digits) { setError('Enter your JEE Main All India Rank to continue.'); return; }
    const n = Number(digits);
    if (n < 1 || n > 2_000_000) { setError('That does not look like a JEE Main rank. Check the number and try again.'); return; }

    setError(null);
    trackEvent('hero_rank_submitted');
    router.push(`/find?rank=${n}`);
  }

  return (
    <div id="hero-cta" style={{ marginTop: 26 }}>
      <form onSubmit={go} noValidate className="hero-cta-form">
        <div className="field" style={{ flex: '1 1 220px', minWidth: 0 }}>
          <label className="label sr-only" htmlFor="hero-rank">JEE Main All India Rank</label>
          <input
            id="hero-rank"
            className="input num"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={pretty}
            onChange={(e) => { setRank(e.target.value); setError(null); }}
            placeholder="Your JEE Main rank"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'hero-rank-err' : undefined}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ flex: '0 0 auto', fontSize: 16, padding: '14px 24px' }}>
          See my colleges
        </button>
      </form>

      {error && (
        <p className="error" id="hero-rank-err" role="alert" style={{ marginTop: 8 }}>
          <span aria-hidden>!</span>{error}
        </p>
      )}

      <p style={{ marginTop: 12, fontSize: 14, color: 'var(--muted)' }}>
        Free to see how many matches you have &middot; {price} to unlock the list &middot;{' '}
        <Link href="/how-it-works">How it works</Link>
      </p>
    </div>
  );
}
