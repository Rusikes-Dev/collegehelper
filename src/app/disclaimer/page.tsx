import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, Disclaimer, PageHeader, Prose, SectionHead } from '@/components/ui';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { AFFILIATION_DISCLAIMER, PREDICTION_DISCLAIMER } from '@/lib/predictor';
import { DATA, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description:
    'CollegeHelper.xyz is an independent tool. Predictions are estimates based ' +
    'on past CAP cutoffs, not guarantees of admission, and the site is not ' +
    'affiliated with MHT-CET, the CET Cell, JoSAA, NTA or any college.',
  alternates: { canonical: '/disclaimer' },
};

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Disclaimer', path: '/disclaimer' },
];

export default function DisclaimerPage() {
  return (
    <div className="screen pb-6">
      <BreadcrumbJsonLd items={CRUMBS} />
      <Breadcrumbs items={CRUMBS} />

      <PageHeader
        title="Disclaimer"
        intro="The three things it would be dishonest not to say plainly."
      />

      <div className="space-y-10">
        <section className="space-y-4">
          <SectionHead title="1. A prediction is not an admission" />
          <Disclaimer>{PREDICTION_DISCLAIMER}</Disclaimer>
          <Prose>
            <p>
              Results compare your figure with the closing cutoffs of a previous
              CAP season. Those cutoffs will not repeat exactly. Seat intake
              changes, institutes are added and removed, branch popularity swings,
              and the difficulty of the paper moves the whole percentile
              distribution. A course that looks safe on this site can close above
              your score, and one marked as a reach can fall within it.
            </p>
            <p>
              Actual allotment is decided by the State CET Cell on the basis of
              your merit, your preference order, your category and eligibility
              documents, and the seats available at the moment your turn comes.
              None of that is visible to this site.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="2. This site is independent" />
          <Disclaimer>{AFFILIATION_DISCLAIMER}</Disclaimer>
          <Prose>
            <p>
              {SITE_NAME} is not a government service and has no role in the
              admission process. It cannot register you for CAP, submit a
              preference form, hold or allot a seat, or intervene in a grievance.
              Institute names, codes and course names appear because they are
              printed in public documents; their appearance here implies no
              endorsement by, or relationship with, those institutes.
            </p>
            <p>
              Where an official process is involved, the official notification wins.
              Always confirm dates, eligibility and procedure against the CET
              Cell&rsquo;s own announcements.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="3. The data is copied, and copying can go wrong" />
          <Prose>
            <p>
              The cutoff figures were extracted from the {DATA.academicYear} CAP
              documents and checked against them, and the method is published in
              full on the <Link href="/methodology">data and method page</Link>. It
              is still an extraction of {DATA.pagesProcessed.toLocaleString('en-IN')}{' '}
              pages, and an error is possible. Where this site and the official
              document disagree, the official document is right. Tell us and it will
              be corrected.
            </p>
            <p>
              Fees, placements, hostels, rankings and reviews are not published here
              unless a person has checked them against a primary source. No ratings
              or review scores are collected or displayed anywhere on this site.
            </p>
          </Prose>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
        <Link href="/methodology" className="font-semibold text-brand hover:underline">
          Data and method
        </Link>
        <Link href="/terms" className="font-semibold text-brand hover:underline">
          Terms of use
        </Link>
        <Link href="/privacy" className="font-semibold text-brand hover:underline">
          Privacy policy
        </Link>
      </div>
    </div>
  );
}
