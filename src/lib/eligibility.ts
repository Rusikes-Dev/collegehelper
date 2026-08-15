import type {
  CutoffRow, Institute, Program, StudentProfile, MatchResult,
  Confidence, UnevaluatedReason, UnevaluatedGroup, RankExam,
} from './types';

/**
 * Eligibility engine.
 *
 * The single rule is `student rank <= previous year's closing rank`, but the
 * hard part is choosing *which* of the student's ranks to compare. JoSAA
 * publishes each closing rank against a specific rank list, and comparing
 * across lists produces badly misleading results:
 *
 *   - IIT rows are JEE Advanced ranks; NIT/IIIT/GFTI rows are JEE Main ranks.
 *     (IISc is a GFTI in JoSAA's grouping but admits through JEE Advanced,
 *     which is why rank exam is stored per institute, not per type.)
 *   - An OPEN closing rank is a Common Rank List rank.
 *   - A reserved-category closing rank is a *category* rank. A student's CRL
 *     is a much larger number than their category rank, so comparing a CRL
 *     against an SC closing rank would wrongly hide almost everything.
 *   - PwD seats are filled from a separate PwD rank list entirely.
 *
 * When the student has not supplied the rank a row requires, the row is
 * reported as unevaluated with a reason, never guessed at.
 */

/** How far inside the cutoff a result must sit to earn each label, as a fraction of the closing rank. */
const CONFIDENCE_BANDS = {
  SAFER: 0.15,      // student is at least 15% clear of last year's closing rank
  MODERATE: 0.05,   // between 5% and 15% clear
} as const;

/** How far outside the cutoff still counts as a near miss worth showing. */
const NEAR_MISS_BAND = 0.2;

export const CONFIDENCE_LABELS: Record<Confidence, { label: string; help: string }> = {
  SAFER: {
    label: 'Comfortable',
    help: 'Your rank was well inside this seat\u2019s closing rank last year.',
  },
  MODERATE: {
    label: 'Likely',
    help: 'Your rank was inside last year\u2019s closing rank with room to spare.',
  },
  BORDERLINE: {
    label: 'Borderline',
    help: 'Your rank was only just inside last year\u2019s closing rank. A small shift in cutoffs could put this out of reach.',
  },
  NEAR_MISS: {
    label: 'Just missed',
    help: 'Your rank was slightly worse than last year\u2019s closing rank. Cutoffs move every year, so this may still be worth listing.',
  },
  OUT_OF_REACH: {
    label: 'Out of reach',
    help: 'Your rank was well beyond last year\u2019s closing rank.',
  },
};

const UNEVALUATED_COPY: Record<UnevaluatedReason, { message: string; action: string }> = {
  NO_ADVANCED_RANK: {
    message: 'These are IIT and IISc seats, which are filled on JEE Advanced ranks.',
    action: 'Add your JEE Advanced rank to include them.',
  },
  NO_CATEGORY_RANK: {
    message: 'These seats are reserved for your category, and JoSAA publishes their cutoffs as category ranks \u2014 not All India Ranks.',
    action: 'Add your category rank to include them. Comparing your All India Rank against a category cutoff would be misleading, so we leave these out instead of guessing.',
  },
  NO_PWD_RANK: {
    message: 'These are PwD seats, filled from a separate PwD rank list.',
    action: 'Add your PwD rank list rank to include them.',
  },
};

/** Which of the student's ranks a given row requires. */
function requiredRank(row: CutoffRow, institute: Institute, student: StudentProfile):
  | { ok: true; exam: RankExam; list: 'CRL' | 'CATEGORY' | 'PWD'; value: number; label: string }
  | { ok: false; reason: UnevaluatedReason } {

  const exam = institute.rankExam;
  const r = student.ranks;
  const examLabel = exam === 'ADVANCED' ? 'JEE Advanced' : 'JEE Main';

  if (row.pwd) {
    const value = exam === 'ADVANCED' ? r.advancedPwd : r.mainPwd;
    if (!value) return { ok: false, reason: 'NO_PWD_RANK' };
    return { ok: true, exam, list: 'PWD', value, label: `${examLabel} PwD rank` };
  }

  if (row.category === 'OPEN') {
    const value = exam === 'ADVANCED' ? r.advancedCrl : r.mainCrl;
    if (!value) return { ok: false, reason: 'NO_ADVANCED_RANK' };
    return { ok: true, exam, list: 'CRL', value, label: `${examLabel} All India Rank` };
  }

  const value = exam === 'ADVANCED' ? r.advancedCategory : r.mainCategory;
  if (!value) {
    // Distinguish "no Advanced rank at all" from "no category rank", so the
    // prompt we show the student is the one that actually unblocks them.
    const hasExamRank = exam === 'ADVANCED' ? Boolean(r.advancedCrl) : Boolean(r.mainCrl);
    return { ok: false, reason: hasExamRank ? 'NO_CATEGORY_RANK' : 'NO_ADVANCED_RANK' };
  }
  return { ok: true, exam, list: 'CATEGORY', value, label: `${examLabel} ${row.category} rank` };
}

/**
 * Categories a student may compete in. Everyone can take an OPEN seat; a
 * reserved-category student can additionally take seats in their own category.
 */
export function eligibleCategories(student: StudentProfile): Set<string> {
  return student.category === 'OPEN'
    ? new Set(['OPEN'])
    : new Set(['OPEN', student.category]);
}

/** Female candidates compete for both pools; everyone else for gender-neutral seats only. */
function genderAllowed(row: CutoffRow, student: StudentProfile): boolean {
  return row.gender === 'NEUTRAL' || student.gender === 'FEMALE';
}

/**
 * Home State / Other State quota. Institute state comes from
 * data/institute-meta.json; when it is unknown we keep the row rather than
 * dropping it, and the UI marks it as home-state dependent.
 */
function quotaAllowed(row: CutoffRow, institute: Institute, student: StudentProfile): boolean {
  if (row.quota === 'AI') return true;
  const instState = institute.state ?? null;
  if (!instState || !student.homeState) return true; // undetermined, surfaced in the UI
  const same = instState.toLowerCase() === student.homeState.toLowerCase();
  if (row.quota === 'HS') return same;
  if (row.quota === 'OS') return !same;
  return true;
}

function classify(margin: number, closeRank: number): Confidence {
  const ratio = margin / closeRank;
  if (margin >= 0) {
    if (ratio >= CONFIDENCE_BANDS.SAFER) return 'SAFER';
    if (ratio >= CONFIDENCE_BANDS.MODERATE) return 'MODERATE';
    return 'BORDERLINE';
  }
  return -ratio <= NEAR_MISS_BAND ? 'NEAR_MISS' : 'OUT_OF_REACH';
}

export interface EvaluateOptions {
  /** Include rows the student misses by up to 20%, for the "just missed" section. */
  includeNearMisses?: boolean;
}

export interface EvaluateInput {
  rows: CutoffRow[];
  institutes: Map<number, Institute>;
  programs: Map<number, Program>;
  student: StudentProfile;
}

export interface EvaluateOutput {
  eligible: MatchResult[];
  nearMisses: MatchResult[];
  unevaluated: UnevaluatedGroup[];
  /** Rank lists that were actually compared, for the transparency panel. */
  ranksUsed: string[];
}

export function evaluate(
  { rows, institutes, programs, student }: EvaluateInput,
  options: EvaluateOptions = {},
): EvaluateOutput {
  const allowedCategories = eligibleCategories(student);
  const eligible: MatchResult[] = [];
  const nearMisses: MatchResult[] = [];
  const unevaluatedCounts = new Map<UnevaluatedReason, number>();
  const ranksUsed = new Set<string>();

  for (const row of rows) {
    if (!allowedCategories.has(row.category)) continue;
    if (row.pwd && !student.isPwd) continue;

    const institute = institutes.get(row.instituteId);
    const program = programs.get(row.programId);
    if (!institute || !program) continue;

    if (!genderAllowed(row, student)) continue;
    if (!quotaAllowed(row, institute, student)) continue;

    const rank = requiredRank(row, institute, student);
    if (!rank.ok) {
      unevaluatedCounts.set(rank.reason, (unevaluatedCounts.get(rank.reason) ?? 0) + 1);
      continue;
    }

    const margin = row.closeRank - rank.value;
    const confidence = classify(margin, row.closeRank);
    if (confidence === 'OUT_OF_REACH') continue;

    ranksUsed.add(rank.label);
    const match: MatchResult = {
      row, institute, program,
      rankUsed: { exam: rank.exam, list: rank.list, value: rank.value, label: rank.label },
      eligible: margin >= 0,
      margin,
      confidence,
    };

    if (margin >= 0) eligible.push(match);
    else if (options.includeNearMisses !== false) nearMisses.push(match);
  }

  const unevaluated: UnevaluatedGroup[] = [...unevaluatedCounts.entries()].map(([reason, count]) => ({
    reason, count, ...UNEVALUATED_COPY[reason],
  }));

  return { eligible, nearMisses, unevaluated, ranksUsed: [...ranksUsed] };
}

/* ------------------------------------------------------------------ *
 * Sorting
 * ------------------------------------------------------------------ */

export type SortKey =
  | 'BEST_FIRST' | 'MARGIN_ASC' | 'MARGIN_DESC'
  | 'CLOSE_RANK_ASC' | 'CLOSE_RANK_DESC' | 'OPEN_RANK_ASC'
  | 'INSTITUTE_ASC' | 'PROGRAM_ASC' | 'TYPE_ASC';

export const SORT_LABELS: Record<SortKey, string> = {
  BEST_FIRST: 'Most competitive first',
  MARGIN_ASC: 'Closest to my rank',
  MARGIN_DESC: 'Safest first',
  CLOSE_RANK_ASC: 'Closing rank: low to high',
  CLOSE_RANK_DESC: 'Closing rank: high to low',
  OPEN_RANK_ASC: 'Opening rank: low to high',
  INSTITUTE_ASC: 'Institute name (A\u2013Z)',
  PROGRAM_ASC: 'Programme name (A\u2013Z)',
  TYPE_ASC: 'Institute type',
};

const TYPE_ORDER: Record<string, number> = { IIT: 0, NIT: 1, IIIT: 2, GFTI: 3 };

export function sortResults(results: MatchResult[], key: SortKey): MatchResult[] {
  const byName = (a: MatchResult, b: MatchResult) =>
    a.institute.name.localeCompare(b.institute.name) || a.program.name.localeCompare(b.program.name);

  const comparators: Record<SortKey, (a: MatchResult, b: MatchResult) => number> = {
    // "Most competitive" = the seats that were hardest to get and are still
    // within reach, which is what a student ranking choices actually wants.
    BEST_FIRST: (a, b) => a.row.closeRank - b.row.closeRank || byName(a, b),
    MARGIN_ASC: (a, b) => a.margin - b.margin || byName(a, b),
    MARGIN_DESC: (a, b) => b.margin - a.margin || byName(a, b),
    CLOSE_RANK_ASC: (a, b) => a.row.closeRank - b.row.closeRank || byName(a, b),
    CLOSE_RANK_DESC: (a, b) => b.row.closeRank - a.row.closeRank || byName(a, b),
    OPEN_RANK_ASC: (a, b) => a.row.openRank - b.row.openRank || byName(a, b),
    INSTITUTE_ASC: byName,
    PROGRAM_ASC: (a, b) => a.program.name.localeCompare(b.program.name) || byName(a, b),
    TYPE_ASC: (a, b) => (TYPE_ORDER[a.institute.type] ?? 9) - (TYPE_ORDER[b.institute.type] ?? 9) || byName(a, b),
  };

  return [...results].sort(comparators[key] ?? comparators.BEST_FIRST);
}
