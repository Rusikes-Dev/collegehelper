/**
 * One place for the facts about the site itself.
 *
 * Contact details, the canonical origin and the provenance of the cutoff data
 * were previously repeated inside page components, which is how the About page
 * ended up shipping "+91 00000 00000" to real visitors. They live here now, and
 * anything still holding a placeholder is hidden rather than displayed: a
 * visible dead phone number costs more trust than a missing row.
 *
 * EDIT THIS FILE, not the pages, when a detail changes.
 */

export const SITE_NAME = 'CollegeHelper.xyz';
export const SITE_SHORT_NAME = 'CollegeHelper';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collegehelper.xyz';

/* ---------------------------------------------------------------------------
 * CONTACT — replace the placeholders below with details you actually monitor.
 *
 * A value left as one of the PLACEHOLDER strings, left empty, or set to null is
 * treated as "not configured" and is not rendered anywhere on the site.
 * ------------------------------------------------------------------------- */
const PLACEHOLDERS = new Set([
  '',
  'hello@collegehelper.xyz',
  '+91 00000 00000',
  '@collegehelper.xyz',
  'https://instagram.com/',
]);

const raw = {
  /** The address students and parents write to. Also the privacy contact. */
  email: 'hello@collegehelper.xyz',
  /** Optional. Shown only if it is a number someone answers. */
  whatsapp: '+91 00000 00000',
  instagram: '@collegehelper.xyz',
  instagramUrl: 'https://instagram.com/',
} as const;

function real(value: string | null | undefined): string | null {
  if (!value) return null;
  return PLACEHOLDERS.has(value.trim()) ? null : value.trim();
}

export const CONTACT = {
  email: real(raw.email),
  whatsapp: real(raw.whatsapp),
  instagram: real(raw.instagram),
  instagramUrl: real(raw.instagramUrl),
  /**
   * Who operates the site. Required in India wherever payments are taken.
   * Keep this truthful — do not add a registration number the site does not
   * have.
   */
  operator: 'CollegeHelper.xyz, Maharashtra, India',
} as const;

/** True when no contact method at all is configured, so pages can say so. */
export const HAS_CONTACT = Boolean(
  CONTACT.email || CONTACT.whatsapp || CONTACT.instagram,
);

/* ---------------------------------------------------------------------------
 * DATA PROVENANCE
 *
 * These are the actual documents the cutoff table was built from, recorded in
 * DATA_PIPELINE.md and reproduced on /methodology so a student can check the
 * numbers against the source rather than take them on trust.
 * ------------------------------------------------------------------------- */
export const DATA = {
  academicYear: '2026-27',
  /** Date the dataset in this repository was imported. Update on re-import. */
  importedOn: '31 August 2026',
  cutoffRows: 90_289,
  institutes: 386,
  programs: 2_330,
  seatTypes: 97,
  pagesProcessed: 4_535,
  anomalies: 0,
  publisher: 'State Common Entrance Test Cell, Government of Maharashtra',
  publisherUrl: 'https://cetcell.mahacet.org/',
  /** The official CAP cutoff PDFs, exactly as published. */
  documents: [
    { round: 'CAP Round I', file: '2026ENGG_CAP1_MH_CutOff_V1.pdf', rows: 36_059 },
    { round: 'CAP Round II', file: '2026ENGG_CAP2_MH_CutOff.pdf', rows: 34_391 },
    { round: 'CAP Round III', file: '2026ENGG_CAP3_MH_CutOff.pdf', rows: 19_839 },
  ],
} as const;
