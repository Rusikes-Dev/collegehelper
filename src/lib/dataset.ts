import 'server-only';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  CutoffRow, Institute, Program, CategoryCode, GenderCode, InstituteTypeCode,
} from './types';

/**
 * Loads the imported cutoff dataset once per server instance and builds the
 * indexes the search API needs.
 *
 * The dataset never reaches the browser. Results are computed on the server and
 * only the requested page of matches is serialised, so the payload the client
 * receives is independent of how large the cutoff file grows.
 */

interface RawDataset {
  meta: {
    generatedAt: string;
    source: string;
    years: number[];
    rounds: number[];
    rowCount: number;
    schema: string[];
  };
  institutes: { id: number; name: string; type: InstituteTypeCode; rankExam: 'MAIN' | 'ADVANCED' }[];
  programs: { id: number; name: string; full: string; degree: string | null; durationYears: number | null }[];
  quotas: { id: number; code: string; label?: string; note?: string }[];
  categories: { id: number; code: CategoryCode; label?: string }[];
  genders: { id: number; code: GenderCode; label?: string }[];
  instituteTypes: Record<string, { label: string; full: string; rankExam: string }>;
  rows: number[][];
}

export interface Dataset {
  meta: RawDataset['meta'];
  rows: CutoffRow[];
  institutes: Map<number, Institute>;
  programs: Map<number, Program>;
  instituteList: Institute[];
  programList: Program[];
  quotaLabels: Map<string, { label: string; note: string }>;
  instituteTypes: RawDataset['instituteTypes'];
  /** Row indexes by institute type, for fast pre-filtering. */
  byInstituteType: Map<InstituteTypeCode, CutoffRow[]>;
}

const DATASET_PATH = process.env.DATASET_PATH ?? join(process.cwd(), 'data', 'dataset.json');
const META_PATH = join(process.cwd(), 'data', 'institute-meta.json');

let cached: Dataset | null = null;

export class DatasetMissingError extends Error {
  constructor() {
    super(
      'No cutoff dataset found. Run the importer first:\n' +
      '  node scripts/import-josaa.mjs --in ./raw --year <year> --round <round>',
    );
    this.name = 'DatasetMissingError';
  }
}

/** Optional institute -> state/city map. Absent entries stay null, never guessed. */
function loadInstituteMeta(): Map<string, { state?: string; city?: string }> {
  if (!existsSync(META_PATH)) return new Map();
  try {
    const raw = JSON.parse(readFileSync(META_PATH, 'utf8')) as Record<string, { state?: string; city?: string }>;
    return new Map(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));
  } catch {
    console.warn('[dataset] institute-meta.json could not be parsed; institute locations will show as unavailable.');
    return new Map();
  }
}

export function loadDataset(): Dataset {
  if (cached) return cached;
  if (!existsSync(DATASET_PATH)) throw new DatasetMissingError();

  const raw = JSON.parse(readFileSync(DATASET_PATH, 'utf8')) as RawDataset;
  const meta = loadInstituteMeta();

  const institutes = new Map<number, Institute>();
  for (const i of raw.institutes) {
    const extra = meta.get(i.name.toLowerCase());
    institutes.set(i.id, { ...i, state: extra?.state ?? null });
  }

  const programs = new Map<number, Program>(raw.programs.map((p) => [p.id, p]));
  const quotaCode = new Map(raw.quotas.map((q) => [q.id, q.code]));
  const categoryCode = new Map(raw.categories.map((c) => [c.id, c.code]));
  const genderCode = new Map(raw.genders.map((g) => [g.id, g.code]));

  const rows: CutoffRow[] = raw.rows.map((r) => ({
    instituteId: r[0],
    programId: r[1],
    quota: quotaCode.get(r[2]) ?? 'AI',
    category: categoryCode.get(r[3]) ?? 'OPEN',
    gender: genderCode.get(r[4]) ?? 'NEUTRAL',
    pwd: r[5] === 1,
    openRank: r[6],
    closeRank: r[7],
    year: r[8],
    round: r[9],
    mixedRankLists: r[10] === 1,
  }));

  const byInstituteType = new Map<InstituteTypeCode, CutoffRow[]>();
  for (const row of rows) {
    const type = institutes.get(row.instituteId)?.type;
    if (!type) continue;
    const bucket = byInstituteType.get(type);
    if (bucket) bucket.push(row);
    else byInstituteType.set(type, [row]);
  }

  cached = {
    meta: raw.meta,
    rows,
    institutes,
    programs,
    instituteList: [...institutes.values()].sort((a, b) => a.name.localeCompare(b.name)),
    programList: [...programs.values()].sort((a, b) => a.name.localeCompare(b.name)),
    quotaLabels: new Map(raw.quotas.map((q) => [q.code, { label: q.label ?? q.code, note: q.note ?? '' }])),
    instituteTypes: raw.instituteTypes,
    byInstituteType,
  };
  return cached;
}

/** Rows narrowed by institute type before the eligibility pass. */
export function rowsForTypes(ds: Dataset, types: InstituteTypeCode[] | 'ALL'): CutoffRow[] {
  if (types === 'ALL') return ds.rows;
  return types.flatMap((t) => ds.byInstituteType.get(t) ?? []);
}

/** Distinct programme names, for the programme picker. */
export function programOptions(ds: Dataset): { id: number; name: string; degree: string | null }[] {
  return ds.programList.map((p) => ({ id: p.id, name: p.name, degree: p.degree }));
}

export function resetDatasetCache(): void {
  cached = null;
}
