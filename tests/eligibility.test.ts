import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate, sortResults } from '../src/lib/eligibility.ts';
import type { CutoffRow, Institute, Program, StudentProfile } from '../src/lib/types.ts';

const iit: Institute = { id: 1, name: 'IIT Bombay', type: 'IIT', rankExam: 'ADVANCED', state: 'Maharashtra' };
const nit: Institute = { id: 2, name: 'NIT Agartala', type: 'NIT', rankExam: 'MAIN', state: 'Tripura' };
const iisc: Institute = { id: 3, name: 'Indian Institute of Science, Bangalore', type: 'GFTI', rankExam: 'ADVANCED', state: 'Karnataka' };

const institutes = new Map([[1, iit], [2, nit], [3, iisc]]);
const programs = new Map<number, Program>([
  [10, { id: 10, name: 'Computer Science and Engineering', full: 'Computer Science and Engineering (4 Years, Bachelor of Technology)', degree: 'Bachelor of Technology', durationYears: 4 }],
]);

function row(p: Partial<CutoffRow>): CutoffRow {
  return {
    instituteId: 2, programId: 10, quota: 'AI', category: 'OPEN', gender: 'NEUTRAL',
    pwd: false, openRank: 100, closeRank: 60_000, year: 2025, round: 1, mixedRankLists: false, ...p,
  };
}

function student(p: Partial<StudentProfile> = {}): StudentProfile {
  return {
    ranks: { mainCrl: 50_000 }, category: 'OPEN', isPwd: false, gender: 'MALE', homeState: null, ...p,
  };
}

const run = (rows: CutoffRow[], s: StudentProfile) => evaluate({ rows, institutes, programs, student: s });

/* -------------------------------------------------- basic rule */

test('rank inside closing rank is eligible', () => {
  const r = run([row({ closeRank: 60_000 })], student());
  assert.equal(r.eligible.length, 1);
  assert.equal(r.eligible[0].margin, 10_000);
});

test('rank beyond closing rank is not eligible', () => {
  const r = run([row({ closeRank: 40_000 })], student({ ranks: { mainCrl: 70_000 } }));
  assert.equal(r.eligible.length, 0);
});

test('rank exactly equal to closing rank is eligible', () => {
  const r = run([row({ closeRank: 50_000 })], student());
  assert.equal(r.eligible.length, 1, 'boundary must be inclusive');
  assert.equal(r.eligible[0].margin, 0);
});

test('rank one worse than closing rank is a near miss, not eligible', () => {
  const r = run([row({ closeRank: 49_999 })], student());
  assert.equal(r.eligible.length, 0);
  assert.equal(r.nearMisses.length, 1);
  assert.equal(r.nearMisses[0].confidence, 'NEAR_MISS');
});

test('far-off rows are dropped entirely, not shown as near misses', () => {
  const r = run([row({ closeRank: 1_000 })], student());
  assert.equal(r.eligible.length + r.nearMisses.length, 0);
});

/* -------------------------------------------------- rank exam routing */

test('IIT rows use the JEE Advanced rank, never JEE Main', () => {
  const s = student({ ranks: { mainCrl: 5_000, advancedCrl: 900 } });
  const r = run([row({ instituteId: 1, closeRank: 1_200 })], s);
  assert.equal(r.eligible.length, 1);
  assert.equal(r.eligible[0].rankUsed.value, 900);
  assert.equal(r.eligible[0].rankUsed.exam, 'ADVANCED');
});

test('NIT rows use the JEE Main rank', () => {
  const s = student({ ranks: { mainCrl: 50_000, advancedCrl: 900 } });
  const r = run([row({ instituteId: 2, closeRank: 60_000 })], s);
  assert.equal(r.eligible[0].rankUsed.value, 50_000);
  assert.equal(r.eligible[0].rankUsed.exam, 'MAIN');
});

test('IISc uses JEE Advanced even though it is grouped with GFTIs', () => {
  const s = student({ ranks: { mainCrl: 5_000, advancedCrl: 900 } });
  const r = run([row({ instituteId: 3, closeRank: 1_200 })], s);
  assert.equal(r.eligible[0].rankUsed.exam, 'ADVANCED');
});

test('without an Advanced rank, IIT rows are reported as unevaluated rather than judged on JEE Main', () => {
  const r = run([row({ instituteId: 1, closeRank: 1_200 })], student({ ranks: { mainCrl: 900 } }));
  assert.equal(r.eligible.length, 0);
  assert.equal(r.unevaluated[0].reason, 'NO_ADVANCED_RANK');
  assert.equal(r.unevaluated[0].count, 1);
});

/* -------------------------------------------------- category rank correctness */

test('a reserved-category row is never judged against the All India Rank', () => {
  // The bug this guards: OBC closing rank 20,000 is an OBC *category* rank.
  // Comparing a CRL of 50,000 against it must not simply return "not eligible",
  // and comparing it the other way must not return a false "eligible".
  const s = student({ category: 'OBC-NCL', ranks: { mainCrl: 50_000 } });
  const r = run([row({ category: 'OBC-NCL', closeRank: 20_000 })], s);
  assert.equal(r.eligible.length, 0);
  assert.equal(r.nearMisses.length, 0);
  assert.equal(r.unevaluated[0].reason, 'NO_CATEGORY_RANK');
});

test('supplying the category rank unlocks reserved rows and compares the right number', () => {
  const s = student({ category: 'OBC-NCL', ranks: { mainCrl: 50_000, mainCategory: 12_000 } });
  const r = run([row({ category: 'OBC-NCL', closeRank: 20_000 })], s);
  assert.equal(r.eligible.length, 1);
  assert.equal(r.eligible[0].rankUsed.value, 12_000);
  assert.equal(r.eligible[0].rankUsed.list, 'CATEGORY');
});

test('a reserved-category student still competes for OPEN seats on their CRL', () => {
  const s = student({ category: 'SC', ranks: { mainCrl: 50_000, mainCategory: 2_000 } });
  const r = run([row({ category: 'OPEN', closeRank: 60_000 })], s);
  assert.equal(r.eligible.length, 1);
  assert.equal(r.eligible[0].rankUsed.list, 'CRL');
  assert.equal(r.eligible[0].rankUsed.value, 50_000);
});

test('an OPEN student never sees reserved-category seats', () => {
  const s = student({ category: 'OPEN', ranks: { mainCrl: 50_000, mainCategory: 100 } });
  const r = run([row({ category: 'SC', closeRank: 300_000 })], s);
  assert.equal(r.eligible.length, 0);
  assert.equal(r.unevaluated.length, 0, 'should be filtered out, not reported as missing data');
});

test('a student never sees a category they do not belong to', () => {
  const s = student({ category: 'SC', ranks: { mainCrl: 50_000, mainCategory: 2_000 } });
  const r = run([row({ category: 'ST', closeRank: 300_000 })], s);
  assert.equal(r.eligible.length, 0);
});

/* -------------------------------------------------- PwD */

test('PwD seats need the PwD rank list and are hidden from non-PwD students', () => {
  const nonPwd = run([row({ pwd: true, closeRank: 300 })], student());
  assert.equal(nonPwd.eligible.length + nonPwd.unevaluated.length, 0);

  const noRank = run([row({ pwd: true, closeRank: 300 })], student({ isPwd: true }));
  assert.equal(noRank.unevaluated[0].reason, 'NO_PWD_RANK');

  const withRank = run([row({ pwd: true, closeRank: 300 })], student({ isPwd: true, ranks: { mainCrl: 50_000, mainPwd: 120 } }));
  assert.equal(withRank.eligible[0].rankUsed.list, 'PWD');
  assert.equal(withRank.eligible[0].rankUsed.value, 120);
});

/* -------------------------------------------------- gender pools */

test('female candidates see both pools, others see gender-neutral only', () => {
  const rows = [row({ gender: 'NEUTRAL', closeRank: 60_000 }), row({ gender: 'FEMALE', closeRank: 80_000 })];
  assert.equal(run(rows, student({ gender: 'FEMALE' })).eligible.length, 2);
  assert.equal(run(rows, student({ gender: 'MALE' })).eligible.length, 1);
});

/* -------------------------------------------------- home state quota */

test('home state quota is applied when the institute state is known', () => {
  const rows = [row({ quota: 'HS', closeRank: 90_000 }), row({ quota: 'OS', closeRank: 90_000 })];
  const local = run(rows, student({ homeState: 'Tripura' }));
  assert.deepEqual(local.eligible.map((m) => m.row.quota), ['HS']);

  const outsider = run(rows, student({ homeState: 'Kerala' }));
  assert.deepEqual(outsider.eligible.map((m) => m.row.quota), ['OS']);
});

test('with no home state supplied, both quotas are kept rather than guessed', () => {
  const rows = [row({ quota: 'HS', closeRank: 90_000 }), row({ quota: 'OS', closeRank: 90_000 })];
  assert.equal(run(rows, student({ homeState: null })).eligible.length, 2);
});

/* -------------------------------------------------- confidence bands */

test('confidence reflects how far inside the cutoff the student sits', () => {
  const s = student({ ranks: { mainCrl: 50_000 } });
  const band = (closeRank: number) => run([row({ closeRank })], s).eligible[0].confidence;
  assert.equal(band(100_000), 'SAFER');      // 50% clear
  assert.equal(band(55_000), 'MODERATE');    // ~9% clear
  assert.equal(band(50_500), 'BORDERLINE');  // ~1% clear
});

/* -------------------------------------------------- sorting */

test('default sort puts the most competitive reachable seat first', () => {
  const s = student({ ranks: { mainCrl: 50_000 } });
  const rows = [row({ closeRank: 90_000 }), row({ closeRank: 55_000 }), row({ closeRank: 70_000 })];
  const sorted = sortResults(run(rows, s).eligible, 'BEST_FIRST');
  assert.deepEqual(sorted.map((m) => m.row.closeRank), [55_000, 70_000, 90_000]);
});

test('closest-to-my-rank sort surfaces the tightest fits first', () => {
  const s = student({ ranks: { mainCrl: 50_000 } });
  const rows = [row({ closeRank: 90_000 }), row({ closeRank: 51_000 })];
  const sorted = sortResults(run(rows, s).eligible, 'MARGIN_ASC');
  assert.equal(sorted[0].row.closeRank, 51_000);
});
