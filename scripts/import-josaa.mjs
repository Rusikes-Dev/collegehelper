#!/usr/bin/env node
/**
 * JoSAA cutoff importer.
 *
 * Reads one or more saved JoSAA "Opening & Closing Rank" HTML pages
 * (Applicant/SeatAllotmentResult/currentorcr.aspx) or CSV exports with the
 * same columns, validates every row, normalises it, and writes a compact
 * dictionary-encoded dataset that the app loads server-side.
 *
 * Usage:
 *   node scripts/import-josaa.mjs --in ./raw --year 2025 --round 1 \
 *        [--out ./data/dataset.json] [--append] [--strict]
 *
 * The source table has NO institute-type, no rank-exam and no year/round
 * column, so those are derived here (institute type from the name, rank exam
 * from the institute, year/round from CLI flags) and every derivation is
 * reported so it can be audited.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, extname, basename, dirname } from 'node:path';

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = { in: './raw', out: './data/dataset.json', append: false, strict: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--append') args.append = true;
    else if (a === '--strict') args.strict = true;
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv);
const YEAR = Number(args.year);
const ROUND = Number(args.round);

if (!Number.isInteger(YEAR) || YEAR < 2015 || YEAR > 2100) {
  fail('--year is required and must be a 4-digit counselling year, e.g. --year 2025');
}
if (!Number.isInteger(ROUND) || ROUND < 1 || ROUND > 10) {
  fail('--round is required and must be the JoSAA round number, e.g. --round 1');
}

function fail(msg) {
  console.error(`\n  Import aborted: ${msg}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Controlled vocabularies
 *
 * Everything the app filters on is declared here. Adding a new category or
 * quota is a one-line change; no application code needs to be touched.
 * ------------------------------------------------------------------ */

const CATEGORIES = {
  OPEN: { label: 'OPEN / General', order: 1 },
  EWS: { label: 'GEN-EWS', order: 2 },
  'OBC-NCL': { label: 'OBC-NCL', order: 3 },
  SC: { label: 'SC', order: 4 },
  ST: { label: 'ST', order: 5 },
};

const QUOTAS = {
  AI: { label: 'All India', note: 'Open to candidates from every state' },
  HS: { label: 'Home State', note: 'Reserved for candidates of the institute\u2019s own state' },
  OS: { label: 'Other State', note: 'For candidates from outside the institute\u2019s state' },
  GO: { label: 'Goa', note: 'State-specific quota' },
  JK: { label: 'Jammu & Kashmir', note: 'State-specific quota' },
  LA: { label: 'Ladakh', note: 'State-specific quota' },
};

const GENDERS = {
  NEUTRAL: { label: 'Gender-Neutral' },
  FEMALE: { label: 'Female-only (including Supernumerary)' },
};

const INSTITUTE_TYPES = {
  IIT: { label: 'IIT', full: 'Indian Institute of Technology', rankExam: 'ADVANCED' },
  NIT: { label: 'NIT', full: 'National Institute of Technology', rankExam: 'MAIN' },
  IIIT: { label: 'IIIT', full: 'Indian Institute of Information Technology', rankExam: 'MAIN' },
  GFTI: { label: 'GFTI', full: 'Government Funded Technical Institution', rankExam: 'MAIN' },
};

/**
 * Institutes whose admitting exam does not follow from their type.
 * IISc admits its BS (Research) programme through JEE Advanced even though
 * JoSAA groups it with the GFTIs.
 */
const RANK_EXAM_OVERRIDES = [
  { match: /indian institute of science/i, rankExam: 'ADVANCED' },
];

/** Name-based institute-type rules, evaluated in order. */
const TYPE_RULES = [
  { re: /\bindian institute of technology\b/i, type: 'IIT' },
  { re: /\bnational institute of technology\b/i, type: 'NIT' },
  { re: /\bindian institute of information technology\b/i, type: 'IIIT' },
  { re: /\binstitute of information technology\b/i, type: 'IIIT' },
];

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

const report = {
  files: [],
  imported: 0,
  skipped: 0,
  errors: [],
  warnings: [],
  duplicates: [],
  unknownCategories: new Map(),
  unknownQuotas: new Map(),
  unknownGenders: new Map(),
  gftiFallback: new Set(),
};

const MAX_LOGGED = 25;
const err = (m) => report.errors.push(m);
const warn = (m) => report.warnings.push(m);

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
};

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** Strip tags, decode entities, collapse whitespace. */
function cellText(html) {
  return decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

const EXPECTED_HEADER = [
  'institute', 'academic program name', 'quota',
  'seat type', 'gender', 'opening rank', 'closing rank',
];

/**
 * Extracts rows from a saved JoSAA results page.
 * Hand-rolled rather than DOM-based: the file is multi-megabyte, the markup is
 * machine-generated and perfectly regular, and this keeps the importer
 * dependency-free.
 */
function parseHtml(src, file) {
  // Isolate the results grid so unrelated layout tables are never picked up.
  const gridStart = src.search(/<table[^>]*id="[^"]*GridView1[^"]*"/i);
  if (gridStart === -1) {
    err(`${file}: no JoSAA results table found. Is this the "Opening & Closing Rank" page, saved as "Web page, complete"?`);
    return [];
  }
  const gridEnd = src.indexOf('</table>', gridStart);
  const grid = src.slice(gridStart, gridEnd === -1 ? undefined : gridEnd);

  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  let headerChecked = false;
  let index = 0;

  while ((m = trRe.exec(grid)) !== null) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => cellText(c[1]));
    if (cells.length === 0) continue;

    if (!headerChecked) {
      const got = cells.map((c) => c.toLowerCase());
      const matches = EXPECTED_HEADER.every((h, i) => got[i]?.includes(h.split(' ')[0]));
      if (!matches) {
        err(`${file}: unexpected table header [${cells.join(' | ')}]. Expected [${EXPECTED_HEADER.join(' | ')}].`);
        return [];
      }
      headerChecked = true;
      continue;
    }

    index++;
    if (cells.length !== 7) {
      // The final row of a partially-saved page is commonly cut mid-record.
      report.skipped++;
      warn(`${file} row ${index}: incomplete row (${cells.length}/7 columns) \u2014 skipped. This usually means the page was saved before it finished rendering.`);
      continue;
    }
    rows.push({ cells, file, line: index });
  }

  if (!headerChecked) err(`${file}: results table had no header row.`);
  return rows;
}

/** Minimal CSV reader (RFC-4180 quoting) for non-HTML sources. */
function parseCsv(src, file) {
  const records = [];
  let field = '', row = [], quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); records.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); records.push(row); }

  const clean = records.filter((r) => r.some((c) => c.trim()));
  if (!clean.length) { err(`${file}: file is empty.`); return []; }

  const header = clean[0].map((h) => h.trim().toLowerCase());
  const missing = EXPECTED_HEADER.filter((h) => !header.some((g) => g.includes(h.split(' ')[0])));
  if (missing.length) {
    err(`${file}: CSV is missing column(s): ${missing.join(', ')}. Required: ${EXPECTED_HEADER.join(', ')}.`);
    return [];
  }
  return clean.slice(1).map((cells, i) => ({
    cells: cells.map((c) => c.trim().replace(/\s+/g, ' ')),
    file,
    line: i + 1,
  }));
}

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

function normaliseInstitute(raw) {
  return raw.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
}

function classifyInstitute(name) {
  for (const rule of TYPE_RULES) if (rule.re.test(name)) return rule.type;
  report.gftiFallback.add(name);
  return 'GFTI';
}

function rankExamFor(name, type) {
  for (const o of RANK_EXAM_OVERRIDES) if (o.match.test(name)) return o.rankExam;
  return INSTITUTE_TYPES[type].rankExam;
}

const PROGRAM_RE = /^(.*?)\s*\(\s*(\d+)\s*Years?\s*,\s*(.*?)\s*\)\s*$/i;

function normaliseProgram(raw, ctx) {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  const m = PROGRAM_RE.exec(cleaned);
  if (!m) {
    warn(`${ctx}: could not split degree from programme name "${cleaned}" \u2014 stored whole.`);
    return { name: cleaned, durationYears: null, degree: null, full: cleaned };
  }
  return {
    name: m[1].replace(/\s+/g, ' ').trim(),
    durationYears: Number(m[2]),
    degree: m[3].trim(),
    full: cleaned,
  };
}

/** "OPEN (PwD)" -> { category: 'OPEN', pwd: true } */
function normaliseSeatType(raw, ctx) {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  const pwd = /\(\s*pwd\s*\)/i.test(cleaned);
  let category = cleaned.replace(/\(\s*pwd\s*\)/i, '').trim().toUpperCase();
  if (category === 'GEN' || category === 'GENERAL') category = 'OPEN';
  if (category === 'GEN-EWS' || category === 'EWS-GEN') category = 'EWS';
  if (category === 'OBC' || category === 'OBC NCL') category = 'OBC-NCL';

  if (!CATEGORIES[category]) {
    report.unknownCategories.set(category, (report.unknownCategories.get(category) ?? 0) + 1);
    return null;
  }
  return { category, pwd };
}

function normaliseGender(raw, ctx) {
  const l = raw.toLowerCase();
  if (l.includes('female')) return 'FEMALE';
  if (l.includes('neutral')) return 'NEUTRAL';
  report.unknownGenders.set(raw, (report.unknownGenders.get(raw) ?? 0) + 1);
  return null;
}

function normaliseQuota(raw) {
  const q = raw.trim().toUpperCase();
  if (!QUOTAS[q]) {
    report.unknownQuotas.set(q, (report.unknownQuotas.get(q) ?? 0) + 1);
    return q || null; // kept, but reported
  }
  return q;
}

/**
 * Ranks may carry a trailing "P", which marks a rank from the separate PwD
 * rank list rather than the main list. It is stripped and recorded, never
 * silently dropped: comparing a PwD rank against a CRL would be wrong.
 */
function normaliseRank(raw, ctx, field) {
  const s = String(raw).trim().replace(/,/g, '');
  if (!s) { err(`${ctx}: ${field} is blank.`); return null; }

  const m = /^(\d+)(?:\.(\d+))?\s*([A-Za-z]*)$/.exec(s);
  if (!m) { err(`${ctx}: ${field} "${raw}" is not a valid rank.`); return null; }

  // JoSAA exports some ranks with a trailing ".0" (seen on NIT Mizoram home-state
  // rows). A zero fraction is a formatting artefact and is dropped; a real
  // fraction would mean the column is not a rank at all, so it is rejected.
  if (m[2] && Number(m[2]) !== 0) {
    err(`${ctx}: ${field} "${raw}" has a fractional part and is not a valid rank.`);
    return null;
  }

  const value = Number(m[1]);
  const suffix = m[3].toUpperCase();
  if (!Number.isInteger(value) || value < 1) { err(`${ctx}: ${field} "${raw}" must be a positive whole number.`); return null; }
  if (value > 2_000_000) { warn(`${ctx}: ${field} ${value} is implausibly large \u2014 kept, please verify.`); }
  if (suffix && suffix !== 'P') { warn(`${ctx}: unrecognised rank suffix "${suffix}" in ${field} "${raw}" \u2014 treated as rank ${value}.`); }

  return { value, pwdRankList: suffix === 'P' };
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

function collectFiles(inputPath) {
  const p = resolve(inputPath);
  if (!existsSync(p)) fail(`input path "${inputPath}" does not exist.`);
  const st = statSync(p);
  const files = st.isDirectory()
    ? readdirSync(p).map((f) => join(p, f)).filter((f) => statSync(f).isFile())
    : [p];
  const usable = files.filter((f) => ['.html', '.htm', '.csv'].includes(extname(f).toLowerCase()));
  if (!usable.length) fail(`no .html or .csv files found in "${inputPath}".`);
  return usable;
}

function build() {
  const institutes = new Map();   // name -> { id, name, type, rankExam }
  const programs = new Map();     // full -> { id, ...program }
  const quotas = new Map();
  const categories = new Map();
  const genders = new Map();
  const seen = new Map();         // natural key -> first location
  const rows = [];

  const intern = (map, key, make) => {
    if (!map.has(key)) map.set(key, { id: map.size, ...make() });
    return map.get(key).id;
  };

  for (const file of collectFiles(args.in)) {
    const src = readFileSync(file, 'utf8');
    const short = basename(file);
    const parsed = extname(file).toLowerCase() === '.csv' ? parseCsv(src, short) : parseHtml(src, short);
    report.files.push({ file: short, rows: parsed.length });

    for (const { cells, line } of parsed) {
      const ctx = `${short} row ${line}`;
      const [rawInst, rawProg, rawQuota, rawSeat, rawGender, rawOpen, rawClose] = cells;

      if (!rawInst?.trim()) { err(`${ctx}: institute name is missing.`); continue; }
      if (!rawProg?.trim()) { err(`${ctx}: academic programme is missing.`); continue; }

      const instName = normaliseInstitute(rawInst);
      const type = classifyInstitute(instName);
      const rankExam = rankExamFor(instName, type);

      const seat = normaliseSeatType(rawSeat, ctx);
      const gender = normaliseGender(rawGender, ctx);
      const quota = normaliseQuota(rawQuota);
      const open = normaliseRank(rawOpen, ctx, 'opening rank');
      const close = normaliseRank(rawClose, ctx, 'closing rank');

      if (!seat || !gender || !quota || !open || !close) { report.skipped++; continue; }

      // JoSAA fills PwD seats from two different rank lists, and marks only the
      // PwD-list ranks with a trailing "P". When the opening and closing ranks
      // come from different lists they are not comparable, so the usual
      // open <= close invariant does not apply and must not reject the row.
      const mixedLists = open.pwdRankList !== close.pwdRankList;
      if (mixedLists) {
        warn(`${ctx}: opening rank (${rawOpen}) and closing rank (${rawClose}) come from different rank lists \u2014 kept, but the opening rank is not comparable and is hidden in the UI.`);
      } else if (open.value > close.value) {
        err(`${ctx}: opening rank ${open.value} is better than closing rank ${close.value} within the same rank list \u2014 row rejected.`);
        report.skipped++;
        continue;
      }

      const prog = normaliseProgram(rawProg, ctx);
      const instId = intern(institutes, instName, () => ({ name: instName, type, rankExam }));
      const progId = intern(programs, prog.full, () => prog);
      const quotaId = intern(quotas, quota, () => ({ code: quota }));
      const catId = intern(categories, seat.category, () => ({ code: seat.category }));
      const genId = intern(genders, gender, () => ({ code: gender }));

      const natural = [instId, progId, quotaId, catId, genId, seat.pwd ? 1 : 0, YEAR, ROUND].join(':');
      if (seen.has(natural)) {
        report.duplicates.push(`${ctx}: duplicate of ${seen.get(natural)} \u2014 ${instName} / ${prog.name} / ${quota} / ${rawSeat} / ${rawGender}. Kept the first.`);
        continue;
      }
      seen.set(natural, ctx);

      rows.push([
        instId, progId, quotaId, catId, genId,
        seat.pwd ? 1 : 0,
        open.value, close.value,
        YEAR, ROUND,
        mixedLists ? 1 : 0,
      ]);
      report.imported++;
    }
  }

  const list = (map, extra = {}) =>
    [...map.values()].sort((a, b) => a.id - b.id).map((v) => ({ ...v, ...(extra[v.code] ?? {}) }));

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'JoSAA seat allotment \u2014 opening and closing ranks',
      years: [YEAR],
      rounds: [ROUND],
      rowCount: rows.length,
      schema: ['institute', 'program', 'quota', 'category', 'gender', 'pwd', 'openRank', 'closeRank', 'year', 'round', 'mixedRankLists'],
    },
    institutes: list(institutes),
    programs: list(programs),
    quotas: list(quotas, QUOTAS),
    categories: list(categories, CATEGORIES),
    genders: list(genders, GENDERS),
    instituteTypes: INSTITUTE_TYPES,
    rows,
  };
}

/* ------------------------------------------------------------------ *
 * Merge + write
 * ------------------------------------------------------------------ */

function mergeWithExisting(next, outPath) {
  if (!args.append || !existsSync(outPath)) return next;

  const prev = JSON.parse(readFileSync(outPath, 'utf8'));
  const idOf = new Map();
  const remap = (destList, srcList, keyFn) => {
    const byKey = new Map(destList.map((d) => [keyFn(d), d.id]));
    const map = new Map();
    for (const s of srcList) {
      const k = keyFn(s);
      if (!byKey.has(k)) { const id = destList.length; destList.push({ ...s, id }); byKey.set(k, id); }
      map.set(s.id, byKey.get(k));
    }
    return map;
  };

  const mi = remap(prev.institutes, next.institutes, (d) => d.name);
  const mp = remap(prev.programs, next.programs, (d) => d.full);
  const mq = remap(prev.quotas, next.quotas, (d) => d.code);
  const mc = remap(prev.categories, next.categories, (d) => d.code);
  const mg = remap(prev.genders, next.genders, (d) => d.code);

  // Drop any existing rows for the year/round being re-imported, so re-running
  // the importer is idempotent rather than additive.
  const before = prev.rows.length;
  prev.rows = prev.rows.filter((r) => !(r[8] === YEAR && r[9] === ROUND));
  const replaced = before - prev.rows.length;
  if (replaced) warn(`Replaced ${replaced.toLocaleString('en-IN')} existing row(s) for ${YEAR} round ${ROUND}.`);

  for (const r of next.rows) {
    // r[10] is mixedRankLists. It was previously dropped here, which silently
    // un-hid incomparable PwD opening ranks on every appended round.
    prev.rows.push([mi.get(r[0]), mp.get(r[1]), mq.get(r[2]), mc.get(r[3]), mg.get(r[4]), r[5], r[6], r[7], r[8], r[9], r[10]]);
  }

  prev.meta.generatedAt = new Date().toISOString();
  prev.meta.rowCount = prev.rows.length;
  prev.meta.years = [...new Set([...prev.meta.years, YEAR])].sort();
  prev.meta.rounds = [...new Set([...prev.meta.rounds, ROUND])].sort();
  prev.instituteTypes = next.instituteTypes;
  return prev;
}

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

function n(x) { return x.toLocaleString('en-IN'); }

function printSummary(ds) {
  const line = '\u2500'.repeat(58);
  console.log(`\n${line}\n  JoSAA import \u2014 ${YEAR}, round ${ROUND}\n${line}`);

  for (const f of report.files) console.log(`  Read    ${f.file} (${n(f.rows)} rows)`);

  console.log(`\n  Imported  ${n(report.imported)} records`);
  console.log(`  Skipped   ${n(report.skipped)}`);
  console.log(`  Warnings  ${n(report.warnings.length)}`);
  console.log(`  Errors    ${n(report.errors.length)}`);
  console.log(`  Duplicates ${n(report.duplicates.length)}`);

  const byType = {};
  for (const i of ds.institutes) byType[i.type] = (byType[i.type] ?? 0) + 1;
  console.log(`\n  Institutes ${n(ds.institutes.length)} \u2014 ` +
    Object.entries(byType).map(([t, c]) => `${t}: ${c}`).join(', '));
  console.log(`  Programmes ${n(ds.programs.length)}`);
  console.log(`  Categories ${ds.categories.map((c) => c.code).join(', ')}`);
  console.log(`  Quotas     ${ds.quotas.map((q) => q.code).join(', ')}`);

  const advanced = ds.institutes.filter((i) => i.rankExam === 'ADVANCED').length;
  console.log(`  Rank exam  ${advanced} institute(s) use JEE Advanced, ${ds.institutes.length - advanced} use JEE Main`);

  const show = (title, items, cap = MAX_LOGGED) => {
    if (!items.length) return;
    console.log(`\n  ${title}`);
    for (const i of items.slice(0, cap)) console.log(`    \u2022 ${i}`);
    if (items.length > cap) console.log(`    \u2026 and ${n(items.length - cap)} more`);
  };

  if (report.gftiFallback.size) {
    show('Classified as GFTI by fallback \u2014 confirm these are correct:', [...report.gftiFallback]);
  }
  for (const [label, map] of [
    ['Unknown categories (rows rejected):', report.unknownCategories],
    ['Unknown quota codes (kept, add to QUOTAS to label them):', report.unknownQuotas],
    ['Unknown gender values (rows rejected):', report.unknownGenders],
  ]) {
    if (map.size) show(label, [...map].map(([k, c]) => `${k || '(blank)'} \u2014 ${n(c)} row(s)`));
  }
  show('Duplicates:', report.duplicates);
  show('Warnings:', report.warnings);
  show('Errors:', report.errors);

  console.log(`\n${line}`);
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const built = build();

if (report.errors.length && args.strict) {
  printSummary(built);
  fail(`${report.errors.length} error(s) with --strict enabled. Nothing was written.`);
}
if (!report.imported) {
  printSummary(built);
  fail('no valid rows were imported. Nothing was written.');
}

const outPath = resolve(args.out);
const final = mergeWithExisting(built, outPath);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(final));

printSummary(final);
console.log(`  Written to ${args.out} (${(statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  Dataset now holds ${n(final.meta.rowCount)} rows across year(s) ${final.meta.years.join(', ')}, round(s) ${final.meta.rounds.join(', ')}.\n`);
