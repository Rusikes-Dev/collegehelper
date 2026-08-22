import type { Metadata } from 'next';
import Link from 'next/link';
import RestoreForm from '@/components/RestoreForm';
import { supabaseConfigured } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Restore your access',
  description:
    'Already paid? Enter the same email address and mobile number you used at checkout to get your college list back on any device.',
  alternates: { canonical: '/restore' },
  openGraph: {
    title: 'Restore your JEE College Finder access',
    description: 'Get your college list back on any device with the email address and mobile number you paid with.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default function RestorePage() {
  const enabled = supabaseConfigured();

  return (
    <div className="wrap" style={{ paddingBlock: '28px 40px', maxWidth: 520 }}>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Restore your access</h1>
      <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>
        Enter the email address and mobile number you used when you paid. They have to match exactly.
      </p>

      {enabled ? (
        <RestoreForm />
      ) : (
        <div className="panel" style={{ marginTop: 24, background: 'var(--border-tint)', borderColor: 'var(--border-line)' }}>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)' }}>
            Restoring access is not switched on for this deployment yet. If you have paid and lost your results,
            use the <Link href="/contact">contact page</Link> and we will sort it out.
          </p>
        </div>
      )}

      <div className="panel" style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 15.5 }}>If it will not let you in</h2>
        <ul style={{ margin: '10px 0 0', paddingLeft: 20, display: 'grid', gap: 7, fontSize: 14.5, color: 'var(--ink-2)' }}>
          <li>Check the email address for a typo &mdash; <span className="num">gmial</span> and <span className="num">gmail</span> are different accounts to us.</li>
          <li>Use the same mobile number. +91, spaces and a leading zero are all fine; a different number is not.</li>
          <li>Payments can take a minute to settle. If you have just paid, wait a moment and try again.</li>
          <li>Still stuck? <Link href="/contact">Contact us</Link> with the date and amount, and we will restore it by hand.</li>
        </ul>
      </div>
    </div>
  );
}
