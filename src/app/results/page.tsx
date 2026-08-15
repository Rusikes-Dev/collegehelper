import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';
import ResultsView from '@/components/ResultsView';

export const metadata: Metadata = { title: 'Your college list', robots: { index: false, follow: false } };
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
