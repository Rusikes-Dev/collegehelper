/**
 * The hand-written layer.
 *
 * Every college on this site already has a page built from the official CAP
 * dataset: its name, its course list and its closing figures all come straight
 * out of data/*.csv. That part needs no author.
 *
 * This file holds the part that does — the things no PDF contains. A note here
 * is merged over the generated record for the matching institute code.
 *
 * TO WRITE UP A COLLEGE
 *   1. Find its 5-digit institute code (it is printed on the college page).
 *   2. Add an entry below, keyed by that code.
 *   3. Fill in only what you have checked against a primary source — the
 *      college's own site, or an official circular.
 *   4. Save. The page picks it up on the next build.
 *
 * Leave anything unchecked OUT of the object entirely. A missing field renders
 * as "not added yet", which is honest. A guessed fee figure is not, and one
 * wrong number costs more trust than ten blanks.
 *
 * `shortName` is worth setting wherever the generated one reads badly: it is
 * derived from the registered name by script, and a registered name is often
 * a society's name rather than the one students use.
 */

export type CollegeNote = {
  /** Overrides the script-derived display name. */
  shortName?: string;
  /** Overrides the script-derived URL segment. Changing this breaks old links. */
  slug?: string;
  /** Prose. Two or three sentences of what this place actually is. */
  about?: string;
  established?: number;
  affiliation?: string;
  website?: string;
  admissionUrl?: string;
  mapsUrl?: string;
  /** Confirmed city/district, replacing the hint derived from the name. */
  city?: string;
  district?: string;
  fees?: { label: string; value: string }[];
  placement?: { label: string; value: string }[];
  hostel?: string;
};

export const COLLEGE_NOTES: Record<string, CollegeNote> = {
  // Veermata Jijabai Technological Institute, Matunga, Mumbai
  '03012': {
    shortName: 'VJTI Mumbai',
    slug: 'vjti-mumbai',
    city: 'Mumbai',
    district: 'Mumbai',
    established: 1887,
    affiliation: 'University of Mumbai',
    about:
      'VJTI is a government-aided autonomous institute in Matunga, Mumbai, founded in ' +
      '1887 as the Victoria Jubilee Technical Institute and renamed in 1997. It is ' +
      'financially supported by the Government of Maharashtra and affiliated to the ' +
      'University of Mumbai. Admission to its first-year engineering seats is through ' +
      'the MHT-CET CAP process.',
    website: 'https://vjti.ac.in',
    admissionUrl: 'https://vjti.ac.in/admissions/',
    mapsUrl:
      'https://maps.google.com/?q=Veermata+Jijabai+Technological+Institute+Matunga+Mumbai',
    // Fees, placement and hostel are not checked yet, so they are absent
    // rather than filled in from a listing site.
  },
};
