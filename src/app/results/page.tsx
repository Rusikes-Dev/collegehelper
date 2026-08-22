import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';
import ResultsView from '@/components/ResultsView';

export const metadata: Metadata = {
  title: 'Your college list',
  description:
    'Your personalised list of JEE programmes whose JoSAA closing ranks were within reach of your rank, with a choice-list builder and PDF export.',
  // Personal and paid. It must never be indexed, and the description exists
  // only so a browser tab or a shared screenshot reads sensibly.
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

/**
 * Server-rendered gate. An unpaid or expired session never reaches the results
 * UI at all, so there is no client state to tamper with.
 */
export default async function ResultsPage() {
  const session = await readSession();
  if (!session) redirect('/find');
  if (!session.paid) redirect('/find');

  return (
    <ResultsView
      mainCrl={session.student.ranks.mainCrl}
      advancedCrl={session.student.ranks.advancedCrl ?? null}
      category={session.student.category}
    />
  );
}
