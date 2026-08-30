/**
 * Import extracted cutoff CSVs into Supabase.
 *
 *   npm run import:cutoffs -- --data ./data --year 2026-27
 *
 * Idempotent: re-running with the same data updates in place rather than
 * duplicating. Reference rows (colleges, programs, branches) are upserted;
 * cutoff rows are replaced per dataset, so re-importing a corrected PDF for
 * one round leaves the other rounds untouched.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The service-role key
 * bypasses RLS, so this script must only ever run locally or in CI — never in
 * the browser and never in a Next.js route handler that a user can reach.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import path from 'node:path';

const args = new Map<string, string>();
process.argv.slice(2).forEach((a, i, all) => {
  if (a.startsWith('--')) args.set(a.slice(2), all[i + 1] ?? '');
});

const DATA_DIR = path.resolve(args.get('data') ?? './data');
const YEAR = args.get('year') ?? '2026-27';
const PDF_DIR = args.get('pdfs') ?? '';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const CHUNK = 1000;

function readCsv<T = Record<string, string>>(name: string): T[] {
  const file = path.join(DATA_DIR, name);
  if (!existsSync(file)) throw new Error(`Missing ${file}. Run extract_cutoffs.py first.`);
  return parse(readFileSync(file), { columns: true, skip_empty_lines: true }) as T[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/**
 * Coarse UI grouping. Order matters: the first match wins, so the more
 * specific families are listed before the general ones.
 */
const FAMILY_RULES: [RegExp, string][] = [
  [/artificial intelligence|machine learning|data science|\bai\b/i, 'AI & Data Science'],
  [/computer|information technology|\bit\b|software|cyber/i, 'Computer & IT'],
  [/electronics|telecommunication|communication|vlsi|instrumentation/i, 'Electronics'],
  [/electrical|power/i, 'Electrical'],
  [/mechanical|automobile|automation|robotics|mechatronics|manufacturing|production/i, 'Mechanical & Robotics'],
  [/civil|structural|construction/i, 'Civil'],
  [/chemical|petro|oil|polymer|paint|plastic|pharmaceut|biotech|bio-?medical|bio-?technology|food|textile|metallurg|material/i, 'Chemical & Allied'],
];
const familyFor = (name: string) =>
  FAMILY_RULES.find(([re]) => re.test(name))?.[1] ?? 'Other';

/** L/F/T/U/K suffixes on a course code, per the legend printed in the PDFs. */
const CHOICE_FLAGS: Record<string, string> = {
  L: 'Regional Language',
  F: 'Female',
  T: 'TFWS',
  U: 'UnAided',
  K: 'Konkan',
};
function choiceFlags(courseCode: string): string[] {
  const suffix = courseCode.slice(10);
  return [...suffix].map((ch) => CHOICE_FLAGS[ch]).filter(Boolean) as string[];
}

async function upsertChunked<T>(table: string, rows: T[], onConflict: string) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db
      .from(table)
      .upsert(rows.slice(i, i + CHUNK) as never, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    process.stdout.write(`\r  ${table}: ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  process.stdout.write('\n');
}

/**
 * PostgREST caps every response at the project's max-rows setting (1,000 by
 * default), so a full-table read has to be paged. Reading college_programs in
 * one shot silently returns the first 1,000 of 2,330 rows and the import then
 * fails on the first unmatched course code.
 */
async function selectAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await db.from(table).select(columns).range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < size) break;
  }
  return out;
}

async function main() {
  console.log(`Importing ${YEAR} from ${DATA_DIR}\n`);

  // --- seat types ----------------------------------------------------------
  const seatTypes = readCsv('seat_types.csv').map((r) => ({
    code: r.code,
    category_group: r.category_group,
    label: r.label,
    gender: r.gender,
    university_scope: r.university_scope || null,
    special: r.special || null,
  }));
  await upsertChunked('seat_types', seatTypes, 'code');

  // --- colleges ------------------------------------------------------------
  const locFile = existsSync(path.join(DATA_DIR, 'institutes_with_location.csv'))
    ? 'institutes_with_location.csv'
    : 'institutes.csv';
  const institutes = readCsv(locFile);
  const usedSlugs = new Set<string>();
  const colleges = institutes.map((r) => {
    let slug = slugify(r.institute_name);
    if (usedSlugs.has(slug)) slug = `${slug}-${r.institute_code}`;
    usedSlugs.add(slug);
    return {
      institute_code: r.institute_code,
      name: r.institute_name,
      slug,
      city: r.city_hint || null,
      district: r.district_hint || null,
      location_verified: false,
      // Left unpublished on purpose: an admin reviews each college before it
      // appears publicly, so derived location hints never ship unchecked.
      is_published: false,
      data_completeness: 'stub',
    };
  });
  await upsertChunked('colleges', colleges, 'institute_code');

  const collegeRows = await selectAll<{ id: string; institute_code: string }>(
    'colleges', 'id, institute_code');
  const collegeByCode = new Map(collegeRows.map((c) => [c.institute_code, c.id]));

  // --- branches ------------------------------------------------------------
  const programs = readCsv('programs.csv');
  // Keyed by slug, not by name. Two source names can slugify to the same value
  // -- "...Engineering (Cyber Security)" and "...Engineering(Cyber Security)"
  // differ only by a space. Since slug is the upsert conflict target, keying by
  // name would put the same slug in one batch twice and Postgres rejects that
  // with "ON CONFLICT DO UPDATE command cannot affect row a second time".
  const branchBySlugDef = new Map<string, { slug: string; name: string; family: string }>();
  for (const p of programs) {
    const slug = slugify(p.program_name);
    if (!branchBySlugDef.has(slug)) {
      branchBySlugDef.set(slug, {
        slug,
        name: p.program_name.replace(/\s+/g, ' ').trim(),
        family: familyFor(p.program_name),
      });
    }
  }
  await upsertChunked('branches', [...branchBySlugDef.values()], 'slug');

  const branchRows = await selectAll<{ id: string; slug: string }>('branches', 'id, slug');
  const branchBySlug = new Map(branchRows.map((b) => [b.slug, b.id]));

  // --- college programs ----------------------------------------------------
  const programRows = programs.map((p) => {
    const collegeId = collegeByCode.get(p.institute_code);
    if (!collegeId) throw new Error(`Unknown institute ${p.institute_code}`);
    return {
      college_id: collegeId,
      branch_id: branchBySlug.get(slugify(p.program_name)) ?? null,
      course_code: p.course_code,
      program_name: p.program_name,
      choice_code_flags: choiceFlags(p.course_code),
      status: p.status || null,
      home_university: p.home_university || null,
    };
  });
  await upsertChunked('college_programs', programRows, 'college_id,course_code');

  const cpRows = await selectAll<{ id: string; college_id: string; course_code: string }>(
    'college_programs', 'id, college_id, course_code');
  const programKey = (collegeId: string, code: string) => `${collegeId}::${code}`;
  const programIdByKey = new Map(
    cpRows.map((p) => [programKey(p.college_id, p.course_code), p.id]),
  );

  // --- datasets + cutoff records -------------------------------------------
  const cutoffs = readCsv('cutoffs.csv');
  const byRound = new Map<string, typeof cutoffs>();
  for (const row of cutoffs) {
    if (!byRound.has(row.cap_round)) byRound.set(row.cap_round, []);
    byRound.get(row.cap_round)!.push(row);
  }

  const roundOrder = (name: string) => {
    const m = name.match(/\b(I{1,3}|IV|V)\b\s*$/);
    return { I: 1, II: 2, III: 3, IV: 4, V: 5 }[m?.[1] ?? 'I'] ?? 1;
  };

  for (const [capRound, rows] of byRound) {
    const sourceDoc = rows[0]?.source_document ?? '';
    let checksum: string | null = null;
    if (PDF_DIR && sourceDoc && existsSync(path.join(PDF_DIR, sourceDoc))) {
      checksum = createHash('sha256')
        .update(readFileSync(path.join(PDF_DIR, sourceDoc)))
        .digest('hex');
    }

    const { data: ds, error: dsErr } = await db
      .from('cutoff_datasets')
      .upsert(
        {
          exam: 'MHT-CET',
          academic_year: YEAR,
          cap_round: capRound,
          round_order: roundOrder(capRound),
          source_document: sourceDoc || null,
          source_checksum: checksum,
          record_count: rows.length,
          imported_at: new Date().toISOString(),
          is_published: false,
        },
        { onConflict: 'exam,academic_year,cap_round' },
      )
      .select('id')
      .single();
    if (dsErr) throw dsErr;

    // Replace this round's rows wholesale so a corrected re-import cannot
    // leave stale records behind.
    const { error: delErr } = await db
      .from('cutoff_records').delete().eq('dataset_id', ds!.id);
    if (delErr) throw delErr;

    const records = rows.map((r) => {
      const collegeId = collegeByCode.get(r.institute_code)!;
      const cpId = programIdByKey.get(programKey(collegeId, r.course_code));
      if (!cpId) throw new Error(`No program for ${r.institute_code}/${r.course_code}`);
      return {
        dataset_id: ds!.id,
        college_program_id: cpId,
        seat_type_code: r.category,
        seat_level: r.seat_level,
        stage: r.stage || null,
        closing_rank: r.closing_rank ? Number(r.closing_rank) : null,
        closing_percentile: r.closing_percentile ? Number(r.closing_percentile) : null,
      };
    });

    console.log(`${capRound}: ${records.length} records`);
    for (let i = 0; i < records.length; i += CHUNK) {
      const { error } = await db.from('cutoff_records').insert(records.slice(i, i + CHUNK));
      if (error) throw new Error(`cutoff_records: ${error.message}`);
      process.stdout.write(`\r  inserted ${Math.min(i + CHUNK, records.length)}/${records.length}`);
    }
    process.stdout.write('\n');
  }

  console.log('\nDone. Datasets and colleges are imported UNPUBLISHED.');
  console.log('Publish them from /admin once you have reviewed the data.');
}

main().catch((e) => {
  console.error('\nImport failed:', e.message);
  process.exit(1);
});
