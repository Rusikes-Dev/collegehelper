/**
 * Build one page's worth of data for every institute in the CAP dataset.
 *
 * The site used to carry a single hand-written college. Everything needed for
 * the other 385 was already sitting in data/ and going unread: institute
 * names, course lists, and 90,000-odd official closing figures.
 *
 * This joins those four CSVs and emits, per institute, a JSON file the page
 * template reads at build time. Nothing here is invented. Every field is
 * copied from the source CSV or left out; where a value is missing the key is
 * written as null so the page can say "not added yet" rather than imply a fact.
 *
 * Runs automatically before `next build` (see the prebuild script), so the
 * generated files never need to be committed.
 *
 *   npm run generate:colleges
 */

import { parse } from 'csv-parse/sync';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'src', 'data', 'generated');

/** Slugs already live in public URLs. Pinned so old links keep working. */
const SLUG_PINS: Record<string, string> = { '03012': 'vjti-mumbai' };

/** Honorifics and initials that sit in front of a memorial name. */
const HONORIFIC = /^(?:shri|shree|sau|smt|smt\.|sow|dr|prof|late|shri\.|adv|hon)\b\.?\s+/i;

/** Words that mark a segment as the registered owner rather than the college. */
const SOCIETY_WORD =
  /\b(?:society|societys|sanstha|sansatha|sansthan|shikshan|shikshana|trust|mandal|mandals|pratishthan|prathisthan|foundation|charitable|parishad|samaj|seva|bahuuddeshiya)\b/i;

/** Administrative prefixes on a place: "Dist. Kolhapur", "Tal-Ambernath". */
const PLACE_PREFIX = /^(?:dist(?:rict)?|tal(?:uka)?|at\s*post|a\/?p|near|via)\b[\s.\-:]*/i;

/**
 * Words that mean a segment names the college itself. A segment can hold both
 * an owner and the college ("Progressive Education Society's Modern College of
 * Engineering"); dropping it because it says "Society" would throw the college
 * away, so a segment is only discarded when it names an owner and nothing else.
 */
const INSTITUTION_WORD =
  /\b(?:colleges?|institutes?|institutions?|academy|school|campus|university|polytechnic|vidyalaya|mahavidyalaya|engineering|technolog(?:y|ical)|centre|center|group)\b/i;

const tidy = (s: string) =>
  s
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,(?=\S)/g, ', ')
    .replace(/(\w)\(/g, '$1 (')
    .trim()
    .replace(/^[\s,.]+|[\s,.]+$/g, '');

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** The CAP list shouts some names. Title-case them so a list reads evenly. */
function fixCaps(s: string): string {
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length < 8) return s;
  const upper = (s.match(/[A-Z]/g) ?? []).length / letters.length;
  if (upper < 0.85) return s;
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase())
    .replace(/\b(Of|And|The|For|In|At)\b/g, (w) => w.toLowerCase());
}

/** Strip a segment down to the place it names. */
function cleanPlace(s: string): string {
  let out = s.replace(/[()]/g, ' ');
  // "Chas Dist. Ahmednagar" -> "Ahmednagar". The district is the half a
  // student searching by location will actually type.
  const dist = /\bdist(?:rict)?\b[\s.\-:]*(.+)$/i.exec(out);
  if (dist) out = dist[1];
  return tidy(out.replace(PLACE_PREFIX, '').replace(/\s+/g, ' '));
}

/**
 * A name that fits a phone row and still identifies the college.
 *
 * The registered names in the CAP list lead with whoever owns the college —
 * "Dattajirao Kadam Technical Education Society's Textile & Engineering
 * Institute, Ichalkaranji" — and that prefix pushes the part a student would
 * recognise off the end of the row. This drops the owner and keeps the place,
 * because the place is what tells two identically-named colleges apart.
 *
 * It works segment by segment rather than by chopping a prefix off the front,
 * so a name that is *entirely* a society ("D.Y.Patil Education Society's,
 * D.Y.Patil Technical Campus, ...") keeps the campus instead of losing it.
 */
function shortName(full: string, city: string): string {
  const cleaned = fixCaps(tidy(full));

  const segments = cleaned
    .split(',')
    .map((p) => tidy(p))
    .filter(Boolean);
  if (!segments.length) return cleaned;

  // Drop leading segments that only name the owner, but never drop the last
  // one — something has to be left to call the place.
  let start = 0;
  while (
    start < segments.length - 1 &&
    SOCIETY_WORD.test(segments[start]) &&
    !INSTITUTION_WORD.test(segments[start])
  ) {
    start++;
  }

  let head = segments[start];
  for (let i = 0; i < 3 && HONORIFIC.test(head); i++) head = tidy(head.replace(HONORIFIC, ''));

  // A trailing "'s" means the owner ran into the college's own name.
  head = tidy(head.replace(/^[A-Za-z][\w.\- &]{2,50}?(?:'s|s')\s+/i, ''));
  // Autonomy is shown as its own tag, so it is redundant inside the name.
  head = tidy(head.replace(/\(\s*autonomous\s*\)/gi, ''));
  head = tidy(head.replace(/\s*\(\s*\)\s*/g, ' '));

  if (!head || head.length < 6) head = segments[start] || cleaned;

  const tail = start < segments.length - 1 ? cleanPlace(segments[segments.length - 1]) : '';
  const place = tail || cleanPlace(city);

  if (place && !head.toLowerCase().includes(place.toLowerCase()) && head.length < 58) {
    return `${head}, ${place}`;
  }
  return head;
}

type Row = Record<string, string>;

function readCsv(name: string): Row[] {
  const text = fs.readFileSync(path.join(DATA, name), 'utf8').replace(/^\uFEFF/, '');
  const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true }) as Row[];
  return rows.map((r) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(r)) out[k.trim()] = (v ?? '').trim();
    return out;
  });
}

const dominant = (values: string[]): string | null => {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of counts) if (n > bestN) [best, bestN] = [v, n];
  return best;
};

function groupBy(rows: Row[], key: string): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return map;
}

function main() {
  const institutes = readCsv('institutes_with_location.csv');
  const programs = readCsv('programs.csv');
  const cutoffs = readCsv('cutoffs.csv');
  const seatTypes = readCsv('seat_types.csv');

  const progsByCode = groupBy(programs, 'institute_code');
  const cutsByCode = groupBy(cutoffs, 'institute_code');

  const seatLabels: Record<string, string> = {};
  for (const r of seatTypes) if (r.code) seatLabels[r.code] = r.label;

  // Course code -> name, so a cutoff row can be labelled even where the
  // programs CSV has no matching entry.
  const courseNames = new Map<string, string>();
  for (const p of programs) courseNames.set(p.course_code, tidy(p.program_name));

  fs.rmSync(path.join(OUT, 'colleges'), { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'colleges'), { recursive: true });

  const usedSlugs = new Set<string>();
  const index: unknown[] = [];
  let cutoffTotal = 0;

  const sorted = [...institutes].sort((a, b) => a.institute_code.localeCompare(b.institute_code));

  for (const inst of sorted) {
    const code = inst.institute_code;
    const fullName = tidy(inst.institute_name);
    const city = tidy(inst.city_hint ?? '');
    const district = tidy(inst.district_hint ?? '');

    const myPrograms = progsByCode.get(code) ?? [];
    const myCutoffs = cutsByCode.get(code) ?? [];
    if (!myPrograms.length && !myCutoffs.length) continue;

    const short = shortName(fullName, city);

    let slug = SLUG_PINS[code] || slugify(short) || `institute-${code}`;
    if (usedSlugs.has(slug)) slug = `${slug}-${code}`;
    usedSlugs.add(slug);

    const status = dominant(myPrograms.map((p) => p.status ?? ''));
    const university = dominant(
      myPrograms.map((p) => p.home_university ?? '').filter((u) => u !== 'Autonomous Institute'),
    );

    const progList = myPrograms
      .map((p) => ({ name: tidy(p.program_name), code: p.course_code, status: p.status || null }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const cutList = myCutoffs.map((c) => ({
      round: c.cap_round,
      program: courseNames.get(c.course_code) ?? c.course_code,
      courseCode: c.course_code,
      seatType: c.category,
      seatLevel: c.seat_level || null,
      closingRank: /^\d+$/.test(c.closing_rank) ? Number(c.closing_rank) : null,
      closingPercentile: c.closing_percentile ? Number(c.closing_percentile) : null,
    }));
    cutoffTotal += cutList.length;

    // "Open category" means all three General-Open scopes: state level, home
    // university, and other-than-home. Counting only the state-level code —
    // as an earlier pass did — left two thirds of colleges with no figure at
    // all, because most affiliated colleges admit on the home-university seat.
    //
    // The spread of open-category cutoffs across this college's branches.
    // Both ends matter and mean opposite things: the low end is the easiest
    // way in, the high end is the branch everyone wants. Publishing only one
    // of them — as an earlier version did — tells a student the wrong thing
    // about whether they have a chance here.
    const openPercentiles = cutList
      .filter((c) => c.seatType.startsWith('GOPEN') && c.closingPercentile != null)
      .map((c) => c.closingPercentile as number);
    const openLow = openPercentiles.length ? Math.min(...openPercentiles) : null;
    const openHigh = openPercentiles.length ? Math.max(...openPercentiles) : null;

    const years = [...new Set(myCutoffs.map((c) => c.academic_year).filter(Boolean))].sort();
    const rounds = [...new Set(cutList.map((c) => c.round))].sort();

    fs.writeFileSync(
      path.join(OUT, 'colleges', `${code}.json`),
      JSON.stringify({
        code,
        slug,
        name: fullName,
        shortName: short,
        city: city || null,
        district: district || null,
        type: status,
        university,
        cutoffYear: years.at(-1) ?? null,
        rounds,
        programs: progList,
        cutoffs: cutList,
      }),
    );

    index.push({
      code,
      slug,
      name: fullName,
      shortName: short,
      city: city || null,
      district: district || null,
      type: status,
      programCount: progList.length,
      openLow: openLow == null ? null : Number(openLow.toFixed(4)),
      openHigh: openHigh == null ? null : Number(openHigh.toFixed(4)),
    });
  }

  (index as { district: string | null; shortName: string }[]).sort(
    (a, b) =>
      (a.district ?? 'zzz').localeCompare(b.district ?? 'zzz') ||
      a.shortName.localeCompare(b.shortName),
  );

  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
  fs.writeFileSync(path.join(OUT, 'seat-types.json'), JSON.stringify(seatLabels, null, 0));

  const kb = (fs.statSync(path.join(OUT, 'index.json')).size / 1024).toFixed(1);
  console.log(
    `colleges ${index.length}  ·  cutoff rows ${cutoffTotal.toLocaleString('en-IN')}  ·  seat types ${
      Object.keys(seatLabels).length
    }  ·  index ${kb} KB`,
  );
}

main();
