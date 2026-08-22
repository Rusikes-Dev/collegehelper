import type { CutoffRow } from './types';

/**
 * Counselling-round selection.
 *
 * Kept in its own module, deliberately free of `server-only`, because
 * `dataset.ts` cannot be imported outside a server component and this logic is
 * worth testing directly. It is pure: rows in, rows out, no I/O.
 */

/**
 * Narrows rows to the chosen counselling rounds.
 *
 * This matters more than it looks. Every seat is published once per round, so
 * with rounds 1 and 6 both loaded an unfiltered search returns each seat twice
 * — the same institute and programme under two different closing ranks. That
 * is not a richer result; it is a list twice as long that a student has to
 * mentally de-duplicate, and a paywall count that reads as double what it is.
 *
 * An empty selection widens to everything rather than returning nothing. A
 * student who has deselected every round should see the unfiltered list, not a
 * blank page that looks like the search broke.
 */
export function rowsForRounds(rows: CutoffRow[], rounds: number[] | 'ALL'): CutoffRow[] {
  if (rounds === 'ALL' || rounds.length === 0) return rows;
  const wanted = new Set(rounds);
  return rows.filter((r) => wanted.has(r.round));
}

/**
 * The last round held — the final allotment, and what a student comparing
 * themselves against "the cutoff" almost always means. Read from the data
 * rather than hard-coded, so the next import moves it without a code change.
 */
export function latestRoundOf(rounds: number[]): number {
  return Math.max(...rounds);
}
