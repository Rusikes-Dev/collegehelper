import type { Metadata } from 'next';
import FindForm from '@/components/FindForm';

export const metadata: Metadata = {
  title: 'Find your colleges',
  description: 'Enter your JEE Main or JEE Advanced rank, category and preferred branches to see which programmes were within reach last year.',
  alternates: { canonical: '/find' },
};

export default function FindPage() {
  return (
    <div className="wrap" style={{ paddingBlock: '28px 40px', maxWidth: 640 }}>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Find your colleges</h1>
      <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>
        Your rank stays on your device until you run the search. No account needed.
      </p>
      <FindForm />
    </div>
  );
}
