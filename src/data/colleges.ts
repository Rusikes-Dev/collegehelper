import fs from 'node:fs';
import path from 'node:path';
import { COLLEGE_NOTES, type CollegeNote } from '@/data/college-notes';

/**
 * College data, read at build time.
 *
 * The records themselves are generated from the official CAP CSVs by
 * scripts/build-college-pages.ts and land in src/data/generated. This module
 * reads them off disk and merges the hand-written notes over the top.
 *
 * Reading with fs rather than importing the JSON keeps a fresh clone
 * typechecking before the generator has ever run, and keeps 21 MB of cutoff
 * rows out of every bundle that touches a type from this file.
 *
 * SERVER ONLY. Client components may import the types with `import type`,
 * which erases at compile time, but must receive the data itself as props.
 */

export type Cutoff = {
  round: string;
  program: string;
  courseCode: string;
  /** Seat-type code exactly as the official PDF prints it, e.g. GOPENS. */
  seatType: string;
  seatLevel: string | null;
  closingRank: number | null;
  closingPercentile: number | null;
};

export type Program = {
  name: string;
  /** DTE choice code, as printed on the CAP option form. */
  code: string;
  status: string | null;
};

export type GeneratedCollege = {
  code: string;
  slug: string;
  name: string;
  shortName: string;
  city: string | null;
  district: string | null;
  type: string | null;
  university: string | null;
  cutoffYear: string | null;
  rounds: string[];
  programs: Program[];
  cutoffs: Cutoff[];
};

/** A generated record with the hand-written note merged in. */
export type College = GeneratedCollege & {
  about: string | null;
  established: number | null;
  affiliation: string | null;
  website: string | null;
  admissionUrl: string | null;
  mapsUrl: string | null;
  fees: { label: string; value: string }[] | null;
  placement: { label: string; value: string }[] | null;
  hostel: string | null;
  /** True when a human has written this one up, not just the script. */
  hasNotes: boolean;
};

export type CollegeListItem = {
  code: string;
  slug: string;
  name: string;
  shortName: string;
  city: string | null;
  district: string | null;
  type: string | null;
  programCount: number;
  /** Lowest and highest open-category closing percentile across all rounds. */
  openLow: number | null;
  openHigh: number | null;
};

const GEN = path.join(process.cwd(), 'src', 'data', 'generated');

const MISSING =
  'College data has not been generated. Run `npm run generate:colleges` ' +
  '(it also runs automatically before `npm run build`).';

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

let indexCache: CollegeListItem[] | null = null;

/** Every college, ordered by district then name. Cheap enough to ship. */
export function collegeIndex(): CollegeListItem[] {
  if (indexCache) return indexCache;

  const raw = readJson<CollegeListItem[]>(path.join(GEN, 'index.json'));
  if (!raw) throw new Error(MISSING);

  // Notes can rename or re-slug a college; the search list must agree with
  // the page it links to.
  indexCache = raw.map((c) => {
    const note = COLLEGE_NOTES[c.code];
    return note
      ? {
          ...c,
          slug: note.slug ?? c.slug,
          shortName: note.shortName ?? c.shortName,
          city: note.city ?? c.city,
          district: note.district ?? c.district,
        }
      : c;
  });
  return indexCache;
}

let slugMapCache: Map<string, string> | null = null;

function slugMap(): Map<string, string> {
  if (slugMapCache) return slugMapCache;
  slugMapCache = new Map(collegeIndex().map((c) => [c.slug, c.code]));
  return slugMapCache;
}

function merge(base: GeneratedCollege, note: CollegeNote | undefined): College {
  return {
    ...base,
    slug: note?.slug ?? base.slug,
    shortName: note?.shortName ?? base.shortName,
    city: note?.city ?? base.city,
    district: note?.district ?? base.district,
    about: note?.about ?? null,
    established: note?.established ?? null,
    affiliation: note?.affiliation ?? null,
    website: note?.website ?? null,
    admissionUrl: note?.admissionUrl ?? null,
    mapsUrl: note?.mapsUrl ?? null,
    fees: note?.fees ?? null,
    placement: note?.placement ?? null,
    hostel: note?.hostel ?? null,
    hasNotes: Boolean(note),
  };
}

export function findCollege(slug: string): College | null {
  const code = slugMap().get(slug);
  if (!code) return null;
  const base = readJson<GeneratedCollege>(path.join(GEN, 'colleges', `${code}.json`));
  return base ? merge(base, COLLEGE_NOTES[code]) : null;
}

export function findCollegeByCode(code: string): College | null {
  const base = readJson<GeneratedCollege>(path.join(GEN, 'colleges', `${code}.json`));
  return base ? merge(base, COLLEGE_NOTES[code]) : null;
}

/** Code -> official label, for every seat type in the CAP legend. */
export function seatTypeLabels(): Record<string, string> {
  return readJson<Record<string, string>>(path.join(GEN, 'seat-types.json')) ?? {};
}

export const roundsFor = (c: College) => [...new Set(c.cutoffs.map((r) => r.round))];

export type CutoffRowCompact = {
  seat: string;
  rank: number | null;
  pct: number | null;
};

export type ProgramCutoffs = {
  name: string;
  code: string;
  rows: CutoffRowCompact[];
};

export type RoundCutoffs = {
  round: string;
  programs: ProgramCutoffs[];
};

/**
 * Cutoffs regrouped for the client, round by round then branch by branch.
 *
 * The flat rows repeat the branch name and course code on every line — nine
 * hundred times over, for the largest college. Grouping them here means each
 * branch name crosses the wire once, which is the difference between a page
 * that opens on a phone and one that does not.
 *
 * Within a branch the open-category seat sorts first, because it is the figure
 * almost every student checks before any other.
 */
export function groupedCutoffs(c: College): RoundCutoffs[] {
  const rounds = new Map<string, Map<string, ProgramCutoffs>>();

  for (const r of c.cutoffs) {
    if (!rounds.has(r.round)) rounds.set(r.round, new Map());
    const programs = rounds.get(r.round)!;
    if (!programs.has(r.courseCode)) {
      programs.set(r.courseCode, { name: r.program, code: r.courseCode, rows: [] });
    }
    programs.get(r.courseCode)!.rows.push({
      seat: r.seatType,
      rank: r.closingRank,
      pct: r.closingPercentile,
    });
  }

  return [...rounds.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([round, programs]) => ({
      round,
      programs: [...programs.values()]
        .map((p) => ({
          ...p,
          rows: p.rows.sort((a, b) => {
            if (a.seat === 'GOPENS') return -1;
            if (b.seat === 'GOPENS') return 1;
            return a.seat.localeCompare(b.seat);
          }),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

/** Only the legend entries this college actually uses. */
export function seatLabelsFor(c: College): Record<string, string> {
  const all = seatTypeLabels();
  const out: Record<string, string> = {};
  for (const r of c.cutoffs) if (all[r.seatType]) out[r.seatType] = all[r.seatType];
  return out;
}

/**
 * The spread of open-category closing percentiles across a college's branches.
 *
 * Both ends are returned because they answer different questions: the low end
 * is the easiest way in, the high end is the branch with the most competition.
 * "Open" covers all three General-Open scopes — state level, home university
 * and other-than-home — since most affiliated colleges admit on the second.
 */
export function openRange(c: College): { low: number; high: number } | null {
  const vals = c.cutoffs
    .filter((r) => r.seatType.startsWith('GOPEN') && r.closingPercentile != null)
    .map((r) => r.closingPercentile as number);
  return vals.length ? { low: Math.min(...vals), high: Math.max(...vals) } : null;
}

/** Name, city, district or institute code. Deliberately forgiving. */
export function searchColleges(query: string): CollegeListItem[] {
  const q = query.trim().toLowerCase();
  const all = collegeIndex();
  if (!q) return all;
  return all.filter((c) =>
    [c.name, c.shortName, c.city, c.district, c.code, c.type]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}

/**
 * Other colleges a visitor is likely to want next: same district first, then
 * the nearest open-category cutoff, so the list is a genuine shortlist rather
 * than whatever happens to sort adjacently.
 */
export function relatedColleges(c: College, limit = 6): CollegeListItem[] {
  const all = collegeIndex().filter((x) => x.code !== c.code);
  const mine = c.cutoffs
    .filter((r) => r.seatType.startsWith('GOPEN') && r.closingPercentile != null)
    .map((r) => r.closingPercentile as number);
  const anchor = mine.length ? Math.max(...mine) : null;

  return all
    .map((x) => {
      const sameDistrict = c.district && x.district === c.district ? 0 : 1;
      const gap =
        anchor != null && x.openHigh != null ? Math.abs(x.openHigh - anchor) : 999;
      return { x, sameDistrict, gap };
    })
    .sort((a, b) => a.sameDistrict - b.sameDistrict || a.gap - b.gap)
    .slice(0, limit)
    .map((r) => r.x);
}

/** Districts with a count, for the browse rail. Unplaced colleges omitted. */
export function districts(): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of collegeIndex()) {
    if (!c.district) continue;
    counts.set(c.district, (counts.get(c.district) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
