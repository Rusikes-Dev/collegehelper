import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'CET updates',
  description:
    'MHT-CET and CAP counselling updates, key dates and plain explanations of percentile, merit rank and the CAP rounds.',
  alternates: { canonical: '/cet-updates' },
};

/* ---------------------------------------------------------------------------
 * EDIT THIS PAGE HERE.
 *
 * Everything below is plain data. Change the three lists and the page changes;
 * you do not need to touch anything else in the file.
 *
 * One rule worth keeping: put a date on every notice and never post a date you
 * have not seen on cetcell.mahacet.org yourself. A wrong date here is worse
 * than no date, because a student will plan around it.
 * ------------------------------------------------------------------------- */

/** Newest first. `date` is shown as written, so keep the format consistent. */
const NOTICES: { date: string; title: string; body: string }[] = [
  {
    date: 'Update this line',
    title: 'Add your first notice here',
    body:
      'Replace this entry with a real update — a CAP round schedule, a change to ' +
      'the option form, a document deadline. Keep it to two or three sentences and ' +
      'always name where you read it.',
  },
];

/** Leave a value as 'To be announced' until it is published officially. */
const KEY_DATES: { label: string; value: string }[] = [
  { label: 'CAP Round I option form', value: 'To be announced' },
  { label: 'CAP Round I seat allotment', value: 'To be announced' },
  { label: 'CAP Round II option form', value: 'To be announced' },
  { label: 'CAP Round III option form', value: 'To be announced' },
];

/** Evergreen explanations. These rarely change year to year. */
const EXPLAINERS: { q: string; a: string }[] = [
  {
    q: 'Percentile and merit rank are not the same thing',
    a: 'Your percentile says what share of candidates scored below you. Your merit rank is your position in the state merit list. The official cutoff lists print both, and one cannot be calculated from the other, so use whichever one you have and compare it with the same column.',
  },
  {
    q: 'What a closing cutoff actually means',
    a: 'A closing cutoff is the last candidate who got a seat in that college, branch, category and round. It is a record of what happened, not a promise about what will happen. Cutoffs move between rounds and between years as preferences change.',
  },
  {
    q: 'Why the round matters',
    a: 'CAP runs in rounds. Seats left unfilled after one round are offered again in the next, so a branch that closed high in Round I can close lower in Round II or III. Always check which round a cutoff came from before comparing it with your own score.',
  },
];

const OFFICIAL = [
  { label: 'State CET Cell, Maharashtra', href: 'https://cetcell.mahacet.org' },
  { label: 'Directorate of Technical Education', href: 'https://dte.maharashtra.gov.in' },
];

export default function CetUpdatesPage() {
  return (
    <div className="screen space-y-8 pb-4">
      <PageHeader
        title="CET updates"
        intro="Dates, notices and the parts of the CAP process students ask us about most."
      />

      <section className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-ink">Notices</h2>
        <ul className="panel divide-rows overflow-hidden">
          {NOTICES.map((n) => (
            <li key={n.title} className="p-4">
              <p className="tnum text-xs text-ink-faint">{n.date}</p>
              <p className="mt-1 text-[0.9375rem] font-semibold leading-snug text-ink">
                {n.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{n.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-ink">Key dates</h2>
        <ul className="panel divide-rows overflow-hidden">
          {KEY_DATES.map((d) => (
            <li key={d.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <span className="text-sm text-ink-muted">{d.label}</span>
              <span
                className={
                  d.value === 'To be announced'
                    ? 'text-right text-sm text-ink-faint'
                    : 'tnum text-right text-sm font-semibold text-ink'
                }
              >
                {d.value}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-ink-faint">
          Dates are only listed here once they appear on the official CET Cell site. Confirm
          every date there before you act on it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-ink">How the process works</h2>
        <dl className="panel divide-rows overflow-hidden">
          {EXPLAINERS.map((e) => (
            <div key={e.q} className="p-4">
              <dt className="text-[0.9375rem] font-semibold leading-snug text-ink">{e.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">{e.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-ink">Official sources</h2>
        <div className="flex flex-wrap gap-2">
          {OFFICIAL.map((o) => (
            <a
              key={o.href}
              href={o.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink hover:bg-wash"
            >
              <ExternalLink size={15} aria-hidden /> {o.label}
            </a>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-ink-faint">
          CollegeHelper is not run by the CET Cell or DTE. Where this page and an official
          notice disagree, the official notice is right.
        </p>
      </section>
    </div>
  );
}
