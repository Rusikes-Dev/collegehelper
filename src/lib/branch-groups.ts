/**
 * Branch choice, reduced to three buttons.
 *
 * The source data has 112 distinct programme names. A student on a phone will
 * not read 112 checkboxes, and the ones who try mostly want the same thing:
 * "computers and electronics", "the traditional branches", or "show me
 * everything". So the filter offers exactly those three, and each button spells
 * out what is inside it — a filter you cannot see into is a filter nobody
 * trusts.
 *
 * To move a branch between groups, edit the regular expressions below. Order
 * matters: the first group whose pattern matches wins, and anything unmatched
 * falls into OTHER.
 */

export type BranchGroupKey = 'TECHNICAL' | 'CORE' | 'OTHER';

export const BRANCH_GROUPS: {
  key: BranchGroupKey;
  label: string;
  blurb: string;
  match: RegExp | null;
}[] = [
  {
    key: 'TECHNICAL',
    label: 'Technical branches',
    blurb: 'Computer, IT, AI and data science, electronics, E&TC, instrumentation, robotics.',
    match:
      /computer|information technology|\bit\b|software|cyber|artificial intelligence|machine learning|data science|\bai\b|electronics|telecommunication|communication|vlsi|instrumentation|robotic|automation|mechatronic/i,
  },
  {
    key: 'CORE',
    label: 'Core branches',
    blurb: 'Civil, mechanical, electrical, chemical, production, automobile, aeronautical.',
    match:
      /civil|structural|construction|mechanical|automobile|manufacturing|production|industrial|electrical|\bpower\b|chemical|petro|metallurg|mining|aeronaut|aerospace|marine/i,
  },
  {
    key: 'OTHER',
    label: 'Other branches',
    blurb: 'Everything else: textile, food technology, bio and biomedical, agriculture, paint and plastics.',
    match: null, // catch-all
  },
];

export function branchGroupFor(name: string): BranchGroupKey {
  for (const g of BRANCH_GROUPS) {
    if (g.match && g.match.test(name)) return g.key;
  }
  return 'OTHER';
}

export const isBranchGroupKey = (v: string): v is BranchGroupKey =>
  BRANCH_GROUPS.some((g) => g.key === v);
