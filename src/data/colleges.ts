/**
 * College pages, written by hand.
 *
 * The predictor already covers every college in the cutoff data. These pages
 * are the ones we have checked and written up properly, and they are kept in
 * this file rather than in the database so that adding one is a small, safe
 * edit with no admin panel and no migration.
 *
 * TO ADD A COLLEGE
 *   1. Copy the block below, from `{` to `},`, and paste it into COLLEGES.
 *   2. Change `slug` to something unique — it becomes the page URL.
 *   3. Fill in what you have checked. Leave anything you have not checked as
 *      `null`. A null renders as "not added yet", which is honest; a guess is
 *      not, and one wrong fee figure costs more trust than ten empty ones.
 *   4. Save. The page, the search entry and the sitemap all appear on their own.
 *
 * The cutoff rows below were taken from the official MHT-CET CAP cutoff PDFs
 * for 2026-27. Keep the closing rank and closing percentile exactly as printed;
 * never calculate one from the other.
 */

export type Cutoff = {
  round: string;
  program: string;
  /** Seat-type code exactly as the official PDF prints it, e.g. GOPENS. */
  seatType: string;
  closingRank: number | null;
  closingPercentile: number | null;
};

export type Program = {
  name: string;
  /** DTE course code, as printed in the CAP documents. */
  code: string;
  intake: number | null;
};

export type College = {
  slug: string;
  name: string;
  shortName: string;
  /** 5-digit DTE institute code. */
  code: string;
  city: string;
  district: string;
  type: string;
  affiliation: string | null;
  established: number | null;
  about: string;
  website: string | null;
  admissionUrl: string | null;
  mapsUrl: string | null;
  programs: Program[];
  cutoffYear: string;
  cutoffs: Cutoff[];
  /** null until someone has checked the official fee circular. */
  fees: { label: string; value: string }[] | null;
  /** null until someone has checked the official placement report. */
  placement: { label: string; value: string }[] | null;
  hostel: string | null;
};

/** The seat-type codes used on these pages, decoded from the PDF legend. */
export const SEAT_TYPE_LABELS: Record<string, string> = {
  GOPENS: 'Open, State level',
  GOBCS: 'OBC, State level',
  GSCS: 'SC, State level',
  GSTS: 'ST, State level',
  LOPENS: 'Ladies Open, State level',
  GVJS: 'VJ/DT, State level',
  GNT1S: 'NT-1, State level',
  GNT2S: 'NT-2, State level',
  GNT3S: 'NT-3, State level',
  EWS: 'Economically Weaker Section',
  TFWS: 'Tuition Fee Waiver Scheme',
};

export const COLLEGES: College[] = [
  {
    slug: 'vjti-mumbai',
    name: 'Veermata Jijabai Technological Institute (VJTI), Matunga, Mumbai',
    shortName: 'VJTI Mumbai',
    code: '03012',
    city: 'Mumbai',
    district: 'Mumbai',
    type: 'Government-Aided Autonomous',
    affiliation: 'University of Mumbai',
    established: 1887,
    about:
      'VJTI is a government-aided autonomous institute in Matunga, Mumbai, founded in ' +
      '1887 as the Victoria Jubilee Technical Institute and renamed in 1997. It is ' +
      'financially supported by the Government of Maharashtra and affiliated to the ' +
      'University of Mumbai. Admission to its first-year engineering seats is through ' +
      'the MHT-CET CAP process.',
    website: 'https://vjti.ac.in',
    admissionUrl: 'https://vjti.ac.in/admissions/',
    mapsUrl: 'https://maps.google.com/?q=Veermata+Jijabai+Technological+Institute+Matunga+Mumbai',
    programs: [
      { name: 'Civil Engineering', code: '0301219110', intake: null },
      { name: 'Computer Engineering', code: '0301224510', intake: null },
      { name: 'Information Technology', code: '0301224610', intake: null },
      { name: 'Electrical Engineering', code: '0301229310', intake: null },
      { name: 'Electronics and Telecommunication Engg', code: '0301237210', intake: null },
      { name: 'Electronics Engineering', code: '0301237610', intake: null },
      { name: 'Mechanical Engineering', code: '0301261210', intake: null },
      { name: 'Production Engineering[Sandwich]', code: '0301262610', intake: null },
      { name: 'Textile Technology', code: '0301289610', intake: null },
    ],
    cutoffYear: '2026-27',
    cutoffs: [
    { round: 'CAP Round I', program: 'Civil Engineering', seatType: 'GOPENS', closingRank: 4390, closingPercentile: 98.9878776 },
    { round: 'CAP Round I', program: 'Civil Engineering', seatType: 'GOBCS', closingRank: 5761, closingPercentile: 98.6682994 },
    { round: 'CAP Round I', program: 'Civil Engineering', seatType: 'GSCS', closingRank: 15032, closingPercentile: 96.4927019 },
    { round: 'CAP Round I', program: 'Civil Engineering', seatType: 'LOPENS', closingRank: 6729, closingPercentile: 98.4497019 },
    { round: 'CAP Round II', program: 'Civil Engineering', seatType: 'GOPENS', closingRank: 4515, closingPercentile: 98.9616221 },
    { round: 'CAP Round II', program: 'Civil Engineering', seatType: 'GOBCS', closingRank: 5185, closingPercentile: 98.8016073 },
    { round: 'CAP Round II', program: 'Civil Engineering', seatType: 'GSCS', closingRank: 17437, closingPercentile: 95.9338334 },
    { round: 'CAP Round II', program: 'Civil Engineering', seatType: 'LOPENS', closingRank: 4142, closingPercentile: 99.0434195 },
    { round: 'CAP Round III', program: 'Civil Engineering', seatType: 'GOPENS', closingRank: 4621, closingPercentile: 98.9254087 },
    { round: 'CAP Round III', program: 'Civil Engineering', seatType: 'LOPENS', closingRank: 4142, closingPercentile: 99.0434195 },
    { round: 'CAP Round I', program: 'Computer Engineering', seatType: 'GOPENS', closingRank: 71, closingPercentile: 99.9923062 },
    { round: 'CAP Round I', program: 'Computer Engineering', seatType: 'GOBCS', closingRank: 120, closingPercentile: 99.9828568 },
    { round: 'CAP Round I', program: 'Computer Engineering', seatType: 'GSCS', closingRank: 2632, closingPercentile: 99.3943022 },
    { round: 'CAP Round I', program: 'Computer Engineering', seatType: 'LOPENS', closingRank: 166, closingPercentile: 99.9726962 },
    { round: 'CAP Round II', program: 'Computer Engineering', seatType: 'GSCS', closingRank: 3718, closingPercentile: 99.1432210 },
    { round: 'CAP Round III', program: 'Computer Engineering', seatType: 'GSCS', closingRank: 5431, closingPercentile: 98.7429314 },
    { round: 'CAP Round I', program: 'Information Technology', seatType: 'GOPENS', closingRank: 243, closingPercentile: 99.9571751 },
    { round: 'CAP Round I', program: 'Information Technology', seatType: 'GOBCS', closingRank: 690, closingPercentile: 99.8424652 },
    { round: 'CAP Round I', program: 'Information Technology', seatType: 'GSCS', closingRank: 4169, closingPercentile: 99.0390182 },
    { round: 'CAP Round I', program: 'Information Technology', seatType: 'LOPENS', closingRank: 480, closingPercentile: 99.8941313 },
    { round: 'CAP Round II', program: 'Information Technology', seatType: 'GOPENS', closingRank: 75, closingPercentile: 99.9922813 },
    { round: 'CAP Round II', program: 'Information Technology', seatType: 'GSCS', closingRank: 4886, closingPercentile: 98.8670753 },
    { round: 'CAP Round II', program: 'Information Technology', seatType: 'LOPENS', closingRank: 218, closingPercentile: 99.9614967 },
    { round: 'CAP Round III', program: 'Information Technology', seatType: 'GOBCS', closingRank: 662, closingPercentile: 99.8507577 },
    { round: 'CAP Round I', program: 'Electrical Engineering', seatType: 'GOPENS', closingRank: 1538, closingPercentile: 99.6454857 },
    { round: 'CAP Round I', program: 'Electrical Engineering', seatType: 'GOBCS', closingRank: 2379, closingPercentile: 99.4488606 },
    { round: 'CAP Round I', program: 'Electrical Engineering', seatType: 'GSCS', closingRank: 11164, closingPercentile: 97.3971254 },
    { round: 'CAP Round I', program: 'Electrical Engineering', seatType: 'LOPENS', closingRank: 2283, closingPercentile: 99.4677796 },
    { round: 'CAP Round II', program: 'Electrical Engineering', seatType: 'GOPENS', closingRank: 1749, closingPercentile: 99.5912170 },
    { round: 'CAP Round II', program: 'Electrical Engineering', seatType: 'GOBCS', closingRank: 1989, closingPercentile: 99.5350803 },
    { round: 'CAP Round II', program: 'Electrical Engineering', seatType: 'GSCS', closingRank: 10460, closingPercentile: 97.5556558 },
    { round: 'CAP Round II', program: 'Electrical Engineering', seatType: 'LOPENS', closingRank: 2359, closingPercentile: 99.4530120 },
    { round: 'CAP Round III', program: 'Electrical Engineering', seatType: 'GOPENS', closingRank: 1769, closingPercentile: 99.5895601 },
    { round: 'CAP Round III', program: 'Electrical Engineering', seatType: 'GSCS', closingRank: 11489, closingPercentile: 97.3130965 },
    { round: 'CAP Round III', program: 'Electrical Engineering', seatType: 'LOPENS', closingRank: 2515, closingPercentile: 99.4150471 },
    { round: 'CAP Round I', program: 'Electronics and Telecommunication Engg', seatType: 'GOPENS', closingRank: 475, closingPercentile: 99.8962576 },
    { round: 'CAP Round I', program: 'Electronics and Telecommunication Engg', seatType: 'GOBCS', closingRank: 1255, closingPercentile: 99.7057484 },
    { round: 'CAP Round I', program: 'Electronics and Telecommunication Engg', seatType: 'GSCS', closingRank: 5773, closingPercentile: 98.6612515 },
    { round: 'CAP Round I', program: 'Electronics and Telecommunication Engg', seatType: 'LOPENS', closingRank: 1155, closingPercentile: 99.7310382 },
    { round: 'CAP Round II', program: 'Electronics and Telecommunication Engg', seatType: 'GOPENS', closingRank: 493, closingPercentile: 99.8906024 },
    { round: 'CAP Round II', program: 'Electronics and Telecommunication Engg', seatType: 'GOBCS', closingRank: 1295, closingPercentile: 99.6976887 },
    { round: 'CAP Round II', program: 'Electronics and Telecommunication Engg', seatType: 'GSCS', closingRank: 6214, closingPercentile: 98.5598385 },
    { round: 'CAP Round II', program: 'Electronics and Telecommunication Engg', seatType: 'LOPENS', closingRank: 1033, closingPercentile: 99.7591522 },
    { round: 'CAP Round III', program: 'Electronics and Telecommunication Engg', seatType: 'GOPENS', closingRank: 490, closingPercentile: 99.8913086 },
    { round: 'CAP Round III', program: 'Electronics and Telecommunication Engg', seatType: 'GSCS', closingRank: 6262, closingPercentile: 98.5473765 },
    { round: 'CAP Round III', program: 'Electronics and Telecommunication Engg', seatType: 'LOPENS', closingRank: 1213, closingPercentile: 99.7190687 },
    { round: 'CAP Round I', program: 'Electronics Engineering', seatType: 'GOPENS', closingRank: 925, closingPercentile: 99.7860594 },
    { round: 'CAP Round I', program: 'Electronics Engineering', seatType: 'GOBCS', closingRank: 1660, closingPercentile: 99.6185118 },
    { round: 'CAP Round I', program: 'Electronics Engineering', seatType: 'GSCS', closingRank: 8403, closingPercentile: 98.0547198 },
    { round: 'CAP Round I', program: 'Electronics Engineering', seatType: 'LOPENS', closingRank: 1531, closingPercentile: 99.6456097 },
    { round: 'CAP Round II', program: 'Electronics Engineering', seatType: 'GOPENS', closingRank: 1121, closingPercentile: 99.7379677 },
    { round: 'CAP Round II', program: 'Electronics Engineering', seatType: 'GOBCS', closingRank: 1776, closingPercentile: 99.5888727 },
    { round: 'CAP Round II', program: 'Electronics Engineering', seatType: 'GSCS', closingRank: 8818, closingPercentile: 97.9405210 },
    { round: 'CAP Round III', program: 'Electronics Engineering', seatType: 'GOPENS', closingRank: 1209, closingPercentile: 99.7201365 },
    { round: 'CAP Round III', program: 'Electronics Engineering', seatType: 'GSCS', closingRank: 8958, closingPercentile: 97.9193354 },
    { round: 'CAP Round III', program: 'Electronics Engineering', seatType: 'LOPENS', closingRank: 1536, closingPercentile: 99.6454857 },
    { round: 'CAP Round I', program: 'Mechanical Engineering', seatType: 'GOPENS', closingRank: 1661, closingPercentile: 99.6185118 },
    { round: 'CAP Round I', program: 'Mechanical Engineering', seatType: 'GOBCS', closingRank: 2697, closingPercentile: 99.3737606 },
    { round: 'CAP Round I', program: 'Mechanical Engineering', seatType: 'GSCS', closingRank: 11337, closingPercentile: 97.3413057 },
    { round: 'CAP Round I', program: 'Mechanical Engineering', seatType: 'LOPENS', closingRank: 3242, closingPercentile: 99.2474239 },
    { round: 'CAP Round II', program: 'Mechanical Engineering', seatType: 'GOPENS', closingRank: 1781, closingPercentile: 99.5888727 },
    { round: 'CAP Round III', program: 'Mechanical Engineering', seatType: 'GOPENS', closingRank: 1786, closingPercentile: 99.5887328 },
    { round: 'CAP Round III', program: 'Mechanical Engineering', seatType: 'LOPENS', closingRank: 2780, closingPercentile: 99.3527968 },
    { round: 'CAP Round I', program: 'Production Engineering[Sandwich]', seatType: 'GOPENS', closingRank: 4369, closingPercentile: 98.9897444 },
    { round: 'CAP Round I', program: 'Production Engineering[Sandwich]', seatType: 'GOBCS', closingRank: 5923, closingPercentile: 98.6266590 },
    { round: 'CAP Round I', program: 'Production Engineering[Sandwich]', seatType: 'GSCS', closingRank: 20622, closingPercentile: 95.1447135 },
    { round: 'CAP Round I', program: 'Production Engineering[Sandwich]', seatType: 'LOPENS', closingRank: 6411, closingPercentile: 98.5168677 },
    { round: 'CAP Round II', program: 'Production Engineering[Sandwich]', seatType: 'GOPENS', closingRank: 4390, closingPercentile: 98.9878776 },
    { round: 'CAP Round II', program: 'Production Engineering[Sandwich]', seatType: 'GOBCS', closingRank: 5987, closingPercentile: 98.6186186 },
    { round: 'CAP Round II', program: 'Production Engineering[Sandwich]', seatType: 'LOPENS', closingRank: 6544, closingPercentile: 98.4914374 },
    { round: 'CAP Round III', program: 'Production Engineering[Sandwich]', seatType: 'GOPENS', closingRank: 3425, closingPercentile: 99.2102425 },
    { round: 'CAP Round III', program: 'Production Engineering[Sandwich]', seatType: 'GOBCS', closingRank: 5792, closingPercentile: 98.6607658 },
    { round: 'CAP Round I', program: 'Textile Technology', seatType: 'GOPENS', closingRank: 7359, closingPercentile: 98.2978560 },
    { round: 'CAP Round I', program: 'Textile Technology', seatType: 'GOBCS', closingRank: 12825, closingPercentile: 96.9840554 },
    { round: 'CAP Round I', program: 'Textile Technology', seatType: 'GSCS', closingRank: 24503, closingPercentile: 94.2160225 },
    { round: 'CAP Round I', program: 'Textile Technology', seatType: 'LOPENS', closingRank: 10901, closingPercentile: 97.4393346 },
    { round: 'CAP Round II', program: 'Textile Technology', seatType: 'GOPENS', closingRank: 8022, closingPercentile: 98.1370729 },
    { round: 'CAP Round II', program: 'Textile Technology', seatType: 'GOBCS', closingRank: 8736, closingPercentile: 97.9716801 },
    { round: 'CAP Round II', program: 'Textile Technology', seatType: 'GSCS', closingRank: 24222, closingPercentile: 94.2691204 },
    { round: 'CAP Round II', program: 'Textile Technology', seatType: 'LOPENS', closingRank: 11775, closingPercentile: 97.2448075 },
    { round: 'CAP Round III', program: 'Textile Technology', seatType: 'GOPENS', closingRank: 8678, closingPercentile: 97.9837600 },
    { round: 'CAP Round III', program: 'Textile Technology', seatType: 'GOBCS', closingRank: 10015, closingPercentile: 97.6807275 },
    { round: 'CAP Round III', program: 'Textile Technology', seatType: 'LOPENS', closingRank: 11247, closingPercentile: 97.3687248 },
    ],
    // Not checked yet. Leave as null rather than repeating a figure from a
    // listing site; the page will say so.
    fees: null,
    placement: null,
    hostel: null,
  },
];

export const findCollege = (slug: string) => COLLEGES.find((c) => c.slug === slug) ?? null;

/** Name, city, district or institute code. Deliberately forgiving. */
export function searchColleges(query: string): College[] {
  const q = query.trim().toLowerCase();
  if (!q) return COLLEGES;
  return COLLEGES.filter((c) =>
    [c.name, c.shortName, c.city, c.district, c.code, c.type]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}

export const roundsFor = (c: College) => [...new Set(c.cutoffs.map((r) => r.round))];
