import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { rowsForRounds } from '../src/lib/rounds.ts';
import type { CutoffRow } from '../src/lib/types.ts';

/**
 * Round filtering exists because loading a second round changed what an
 * unfiltered search means.
 *
 * Every seat is published once per round. With rounds 1 and 6 both loaded, a
 * search that does not choose a round returns each seat twice — the same
 * institute and programme at two different closing ranks. That inflates the
 * count on the paywall, which is the number a student decides whether to pay
 * against, so these tests guard the de-duplication rather than the plumbing.
 */

const row = (round: number, closeRank: number, programId = 0): CutoffRow => ({
  instituteId: 0,
  programId,
  quota: 'AI',
  category: 'OPEN',
  gender: 'NEUTRAL',
  pwd: false,
  openRank: 1,
  closeRank,
  year: 2025,
  round,
  mixedRankLists: false,
});

describe('rowsForRounds', () => {
  const rows = [row(1, 1000), row(6, 1500), row(1, 2000, 1), row(6, 2600, 1)];

  test('selecting one round returns only that round', () => {
    const only6 = rowsForRounds(rows, [6]);
    assert.equal(only6.length, 2);
    assert.ok(only6.every((r) => r.round === 6));
  });

  test('the same seat is not returned twice when a single round is chosen', () => {
    const only1 = rowsForRounds(rows, [1]);
    const keys = only1.map((r) => `${r.instituteId}-${r.programId}`);
    assert.equal(new Set(keys).size, keys.length, 'a seat appeared more than once');
  });

  test('ALL keeps every round, so rounds can be compared side by side', () => {
    assert.equal(rowsForRounds(rows, 'ALL').length, 4);
  });

  test('an empty selection is treated as ALL rather than as no results', () => {
    // A student who deselects every round should not be shown a blank page
    // that looks like a failed search.
    assert.equal(rowsForRounds(rows, []).length, 4);
  });

  test('selecting several rounds keeps exactly those', () => {
    assert.equal(rowsForRounds(rows, [1, 6]).length, 4);
    assert.equal(rowsForRounds(rows, [1, 3]).length, 2);
  });

  test('a round with no data yields nothing rather than falling back', () => {
    // Silently widening to another round would show cutoffs the student did
    // not ask for, under a heading saying they had.
    assert.equal(rowsForRounds(rows, [4]).length, 0);
  });

  test('later rounds carry the looser closing rank, as JoSAA publishes them', () => {
    const r1 = rowsForRounds(rows, [1]).find((r) => r.programId === 0)!;
    const r6 = rowsForRounds(rows, [6]).find((r) => r.programId === 0)!;
    assert.ok(r6.closeRank > r1.closeRank);
  });

  test('the input array is not mutated', () => {
    const before = rows.length;
    rowsForRounds(rows, [6]);
    assert.equal(rows.length, before);
  });
});
