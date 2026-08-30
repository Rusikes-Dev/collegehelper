import type { Thresholds } from '@/lib/settings';

/**
 * Turning a cutoff row into a "chance" band.
 *
 * Deliberately pure and free of database access so it can be unit-tested and
 * so the same rules apply on the server and in any future client preview.
 *
 * The two modes are never mixed. A percentile is compared with a percentile
 * and a rank with a rank; no formula converts between them, because the source
 * documents publish both and inventing a conversion would silently fabricate
 * data. See DATA_PIPELINE.md.
 */

export type RankType = 'PERCENTILE' | 'MERIT_RANK';
export type Chance = 'GOOD' | 'POSSIBLE' | 'REACH';

export type CutoffRow = {
  college_id: string;
  college_name: string;
  college_slug: string;
  city: string | null;
  district: string | null;
  institute_type: string | null;
  institute_code: string;
  branch_id: string | null;
  branch_name: string | null;
  program_name: string;
  course_code: string;
  cap_round: string;
  round_order: number;
  seat_type_code: string;
  seat_type_label: string;
  seat_level: string;
  stage: string | null;
  closing_rank: number | null;
  closing_percentile: number | null;
};

export type PredictionRow = CutoffRow & {
  chance: Chance;
  /** Signed difference between the user's value and the closing cutoff. */
  margin: number;
  /** Human-readable margin, e.g. "+2.41 percentile" or "8,432 ranks clear". */
  marginLabel: string;
};

export const CHANCE_META: Record<
  Chance,
  { label: string; blurb: string; dot: string; chip: string }
> = {
  GOOD: {
    label: 'Good chance',
    blurb: 'Comfortably ahead of this round\u2019s closing cutoff.',
    dot: 'bg-good',
    chip: 'bg-good-tint text-good',
  },
  POSSIBLE: {
    label: 'Possible',
    blurb: 'Close to the closing cutoff \u2014 could go either way.',
    dot: 'bg-possible',
    chip: 'bg-possible-tint text-possible',
  },
  REACH: {
    label: 'Reach',
    blurb: 'Below the closing cutoff, but worth listing as an ambitious option.',
    dot: 'bg-reach',
    chip: 'bg-reach-tint text-reach',
  },
};

/**
 * Percentile mode: higher is better, so margin = user - closing.
 * Rank mode: lower is better, so margin = closing - user. In both modes a
 * positive margin means the candidate is ahead of the cutoff.
 */
export function computeMargin(
  row: CutoffRow,
  rankType: RankType,
  value: number,
): number | null {
  if (rankType === 'PERCENTILE') {
    if (row.closing_percentile == null) return null;
    return value - row.closing_percentile;
  }
  if (row.closing_rank == null) return null;
  return row.closing_rank - value;
}

export function bandFor(
  margin: number,
  rankType: RankType,
  value: number,
  row: CutoffRow,
  t: Thresholds,
): Chance {
  if (rankType === 'PERCENTILE') {
    if (margin >= t.good_chance_percentile) return 'GOOD';
    if (margin >= t.possible_percentile) return 'POSSIBLE';
    return 'REACH';
  }
  // Rank thresholds are ratios of the closing rank, so the same setting works
  // for a cutoff of 900 and a cutoff of 190,000.
  const base = row.closing_rank ?? value ?? 1;
  const ratio = margin / Math.max(base, 1);
  if (ratio >= t.good_chance_rank_ratio) return 'GOOD';
  if (ratio >= t.possible_rank_ratio) return 'POSSIBLE';
  return 'REACH';
}

const nf = new Intl.NumberFormat('en-IN');

export function marginLabel(margin: number, rankType: RankType): string {
  if (rankType === 'PERCENTILE') {
    const v = Math.abs(margin).toFixed(2);
    return margin >= 0
      ? `${v} percentile ahead of the cutoff`
      : `${v} percentile short of the cutoff`;
  }
  const v = nf.format(Math.round(Math.abs(margin)));
  return margin >= 0 ? `${v} ranks clear` : `${v} ranks short`;
}

export function classify(
  rows: CutoffRow[],
  rankType: RankType,
  value: number,
  thresholds: Thresholds,
): PredictionRow[] {
  const out: PredictionRow[] = [];
  for (const row of rows) {
    const margin = computeMargin(row, rankType, value);
    // A row without a value in the requested mode is skipped, never guessed at.
    if (margin === null) continue;
    out.push({
      ...row,
      margin,
      chance: bandFor(margin, rankType, value, row, thresholds),
      marginLabel: marginLabel(margin, rankType),
    });
  }
  // Chance first, then the most competitive college within each group: highest
  // closing percentile, or lowest closing rank. Sorting by margin alone put the
  // easiest colleges at the top, which is the opposite of what a candidate
  // wants to see -- they want the best college they have a shot at.
  const bandRank: Record<Chance, number> = { GOOD: 0, POSSIBLE: 1, REACH: 2 };
  const competitiveness = (r: PredictionRow) =>
    rankType === 'PERCENTILE' ? -(r.closing_percentile ?? 0) : (r.closing_rank ?? 0);

  return out.sort(
    (a, b) =>
      bandRank[a.chance] - bandRank[b.chance] ||
      competitiveness(a) - competitiveness(b) ||
      a.round_order - b.round_order,
  );
}

export function summarise(rows: PredictionRow[]) {
  return {
    total: rows.length,
    good: rows.filter((r) => r.chance === 'GOOD').length,
    possible: rows.filter((r) => r.chance === 'POSSIBLE').length,
    reach: rows.filter((r) => r.chance === 'REACH').length,
    colleges: new Set(rows.map((r) => r.college_id)).size,
  };
}

export const PREDICTION_DISCLAIMER =
  'College predictions are based on historical/available cutoff data and are ' +
  'for informational purposes only. Admission is not guaranteed. Actual ' +
  'allotment depends on official counselling rules, seat availability, ' +
  'category, eligibility, preferences, and other factors.';

export const AFFILIATION_DISCLAIMER =
  'CollegeHelper.xyz is an independent platform and is not affiliated with ' +
  'MHT-CET, CET Cell, JoSAA, NTA, or any college unless explicitly stated.';
