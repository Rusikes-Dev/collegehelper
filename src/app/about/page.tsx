import type { Metadata } from 'next';
import Link from 'next/link';
import { Instagram, Mail, MessageCircle } from 'lucide-react';
import { PageHeader, Disclaimer } from '@/components/ui';
import { AFFILIATION_DISCLAIMER, PREDICTION_DISCLAIMER } from '@/lib/predictor';

export const metadata: Metadata = {
  title: 'About and contact',
  description:
    'What CollegeHelper does, where its cutoff data comes from, and how to reach us.',
  alternates: { canonical: '/about' },
};

/* ---------------------------------------------------------------------------
 * PUT YOUR REAL CONTACT DETAILS HERE.
 *
 * These are placeholders. A student who cannot reach a person will not pay,
 * so replace all three before going live — and use an address you actually
 * read. Set a value to null to hide that row.
 * ------------------------------------------------------------------------- */
const CONTACT = {
  email: 'hello@collegehelper.xyz',
  whatsapp: '+91 00000 00000',
  instagram: '@collegehelper.xyz',
  instagramUrl: 'https://instagram.com/',
  /** Shown at the bottom. Required in India if you take payments. */
  operator: 'CollegeHelper.xyz, Maharashtra, India',
};

const WHAT_WE_DO = [
  {
    title: 'The predictor',
    body: 'You enter your MHT-CET percentile or merit rank, your category and the branches you are open to. We compare it against the official CAP closing cutoffs and sort the results into good chance, possible and reach.',
  },
  {
    title: 'College pages',
    body: 'Courses, official cutoffs and admission links for colleges we have checked and written up. We add them one at a time rather than generating a page for every college with nothing on it.',
  },
  {
    title: 'CET updates',
    body: 'Dates and notices that matter during admissions, with a link to the official source for every one of them.',
  },
];

const HOW_WE_WORK = [
  'The cutoff figures come from the official MHT-CET CAP cutoff PDFs published by the State CET Cell, read straight from the documents.',
  'Percentile and merit rank are never converted into each other. The official lists publish both, and deriving one from the other would be a guess dressed up as data.',
  'Where we do not have something — a fee, a placement figure, a hostel detail — the page says so instead of filling the space.',
  'A prediction is a comparison with last year\u2019s closing figures. It is not an allotment and we never present it as one.',
];

export default function AboutPage() {
  return (
    <div className="screen space-y-8 pb-4">
      <PageHeader
        title="About CollegeHelper"
        intro="A straight answer to one question: with this MHT-CET score, which colleges are actually within reach?"
      />

      <section className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-ink">What this site does</h2>
        <dl className="panel divide-rows overflow-hidden">
          {WHAT_WE_DO.map((w) => (
            <div key={w.title} className="p-4">
              <dt className="text-[0.9375rem] font-semibold text-ink">{w.title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">{w.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-ink">Where the numbers come from</h2>
        <ul className="space-y-2.5">
          {HOW_WE_WORK.map((h) => (
            <li key={h} className="flex gap-2.5 text-sm leading-relaxed text-ink-muted">
              <span className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
              {h}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-ink">Contact</h2>
        <ul className="panel divide-rows overflow-hidden">
          {CONTACT.email && (
            <li>
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center gap-3 p-4 hover:bg-wash"
              >
                <Mail size={18} className="shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-ink">Email</span>
                  <span className="block text-sm text-ink-muted">{CONTACT.email}</span>
                </span>
              </a>
            </li>
          )}
          {CONTACT.whatsapp && (
            <li className="flex items-center gap-3 p-4">
              <MessageCircle size={18} className="shrink-0 text-brand" aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-ink">WhatsApp</span>
                <span className="tnum block text-sm text-ink-muted">{CONTACT.whatsapp}</span>
              </span>
            </li>
          )}
          {CONTACT.instagram && (
            <li>
              <a
                href={CONTACT.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 hover:bg-wash"
              >
                <Instagram size={18} className="shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-ink">Instagram</span>
                  <span className="block text-sm text-ink-muted">{CONTACT.instagram}</span>
                </span>
              </a>
            </li>
          )}
        </ul>
        <p className="text-sm leading-relaxed text-ink-muted">
          Paid and cannot get back in?{' '}
          <Link href="/restore-access" className="font-semibold text-brand hover:underline">
            Restore my access
          </Link>{' '}
          with the email and phone number you used. If that does not work, email us and we
          will sort it out by hand.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-ink">The fine print</h2>
        <Disclaimer>{PREDICTION_DISCLAIMER}</Disclaimer>
        <Disclaimer>{AFFILIATION_DISCLAIMER}</Disclaimer>
        <p className="text-xs text-ink-faint">Operated by {CONTACT.operator}.</p>
      </section>
    </div>
  );
}
