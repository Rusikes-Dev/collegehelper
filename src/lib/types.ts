export type InstituteTypeCode = 'IIT' | 'NIT' | 'IIIT' | 'GFTI';
export type RankExam = 'MAIN' | 'ADVANCED';
export type CategoryCode = 'OPEN' | 'EWS' | 'OBC-NCL' | 'SC' | 'ST';
export type GenderCode = 'NEUTRAL' | 'FEMALE';
export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Institute {
  id: number;
  name: string;
  type: InstituteTypeCode;
  rankExam: RankExam;
  /** Filled from data/institute-meta.json. Null when we genuinely don't know. */
  state?: string | null;
}

export interface Program {
  id: number;
  /** Programme without the degree suffix, e.g. "Computer Science and Engineering". */
  name: string;
  /** Full string as published, e.g. "... (4 Years, Bachelor of Technology)". */
  full: string;
  degree: string | null;
  durationYears: number | null;
}

export interface CutoffRow {
  instituteId: number;
  programId: number;
  quota: string;
  category: CategoryCode;
  gender: GenderCode;
  pwd: boolean;
  openRank: number;
  closeRank: number;
  year: number;
  round: number;
  /** Opening and closing rank came from different rank lists; opening rank is not comparable. */
  mixedRankLists: boolean;
}

/** The set of ranks a student can supply. Every one is optional except mainCrl. */
export interface StudentRanks {
  /** JEE Main Common Rank List (All India Rank). */
  mainCrl: number;
  /** JEE Main category rank, e.g. the student's OBC-NCL rank. */
  mainCategory?: number | null;
  /** JEE Main PwD rank list rank. */
  mainPwd?: number | null;
  /** JEE Advanced Common Rank List. */
  advancedCrl?: number | null;
  advancedCategory?: number | null;
  advancedPwd?: number | null;
}

export interface StudentProfile {
  ranks: StudentRanks;
  category: CategoryCode;
  isPwd: boolean;
  gender: StudentGender;
  /** Used for Home State / Other State quota. Null when not supplied. */
  homeState?: string | null;
}

export interface SearchPreferences {
  instituteTypes: InstituteTypeCode[] | 'ALL';
  programIds: number[] | 'ALL';
  years?: number[];
  /**
   * Counselling rounds to compare against. 'ALL' shows every round side by
   * side; a list picks specific ones. Undefined on sessions created before
   * round selection existed, and treated as the latest round.
   */
  rounds?: number[] | 'ALL';
}

export type Confidence = 'SAFER' | 'MODERATE' | 'BORDERLINE' | 'NEAR_MISS' | 'OUT_OF_REACH';

/**
 * Why a row could not be evaluated. Surfaced to the student verbatim rather
 * than silently dropping the row or guessing with the wrong rank.
 */
export type UnevaluatedReason =
  | 'NO_ADVANCED_RANK'
  | 'NO_CATEGORY_RANK'
  | 'NO_PWD_RANK';

export interface MatchResult {
  row: CutoffRow;
  institute: Institute;
  program: Program;
  /** Which of the student's ranks was compared. */
  rankUsed: {
    exam: RankExam;
    list: 'CRL' | 'CATEGORY' | 'PWD';
    value: number;
    label: string;
  };
  eligible: boolean;
  /** closeRank - studentRank. Positive means the student is inside last year's cutoff. */
  margin: number;
  confidence: Confidence;
}

export interface UnevaluatedGroup {
  reason: UnevaluatedReason;
  count: number;
  message: string;
  /** What the student can do about it. */
  action: string;
}
