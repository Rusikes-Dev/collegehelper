import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import FindForm from '@/components/FindForm';
import { PRICE_LABEL } from '@/lib/razorpay';

export const metadata: Metadata = {
  title: 'Find your colleges',
  description:
    'Enter your JEE Main or JEE Advanced rank, category and preferred branches to see which JoSAA programmes had closing ranks within your reach. Match count is free.',
  alternates: { canonical: '/find' },
  openGraph: {
    title: 'Find the JEE colleges within reach of your rank',
    description: 'Rank, category and branches in about two minutes. See your match count before paying.',
    type: 'website',
  },
};

/** Matches the skeleton FindForm shows while `/api/options` is in flight. */
function FormFallback() {
  return (
    <div style={{ marginTop: 28, display: 'grid', gap: 18 }} aria-busy="true" aria-label="Loading the form">
      {[64, 64, 92, 92, 64].map((h, i) => <div key={i} className="skeleton" style={{ height: h }} />)}
    </div>
  );
}

export default function FindPage() {
  return (
    <div className="wrap" style={{ paddingBlock: '28px 40px', maxWidth: 640 }}>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Find your colleges</h1>
      <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>
        Seeing how many matches you have is free. You only pay {PRICE_LABEL} to open the list itself.
      </p>

      {/* FindForm reads ?rank= from the URL, which needs a boundary in Next 15
          or the whole route is forced out of static rendering. */}
      <Suspense fallback={<FormFallback />}>
        <FindForm />
      </Suspense>

      <p style={{ marginTop: 26, fontSize: 13.5, color: 'var(--muted)' }}>
        Already paid? <Link href="/restore">Restore your access</Link> instead &mdash; you will not be charged twice.
      </p>
    </div>
  );
}
