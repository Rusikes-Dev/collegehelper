import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, PageHeader, SectionHead } from '@/components/ui';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/json-ld';
import { DATA } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description:
    'How the MHT-CET college predictor works, which year of CAP cutoff data ' +
    'it uses, what good chance, possible and reach mean, and how accurate a ' +
    'prediction can honestly be.',
  alternates: { canonical: '/faq' },
};

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'FAQ', path: '/faq' },
];

/**
 * Every answer here describes the system as it is actually built. Where the
 * honest answer is "we cannot tell you that", it says so — a FAQ that only
 * asks flattering questions is marketing, and a student comparing three
 * predictor sites can tell the difference immediately.
 *
 * The plain-text answers are shared between the rendered page and the FAQPage
 * markup, so the two cannot drift apart.
 */
const GROUPS: { heading: string; items: { q: string; a: string }[] }[] = [
  {
    heading: 'Using the predictor',
    items: [
      {
        q: 'How does the MHT-CET college predictor work?',
        a:
          'You enter your MHT-CET percentile or your CAP merit rank, your category, ' +
          'and the branches you would accept. Your figure is compared against the ' +
          'closing cutoff of every matching course in the official CAP data, and each ' +
          'course is sorted into good chance, possible or reach depending on how far ' +
          'ahead of or behind that closing figure you are. There is no model and no ' +
          'guesswork — it is a comparison against what actually happened last time.',
      },
      {
        q: 'Should I enter my percentile or my merit rank?',
        a:
          'Either works, and the result is equally valid. Percentile is what most ' +
          'students know first, so it is the usual choice. Use merit rank if you have ' +
          'your CAP merit number, because it is the figure the counselling process ' +
          'itself runs on. Do not convert one into the other yourself; the two are ' +
          'never mixed, and a converted figure would be a guess.',
      },
      {
        q: 'Does my category affect the prediction?',
        a:
          'Yes, and it usually changes the result more than anything else. Cutoffs are ' +
          'published separately for every seat type — your category, your gender, and ' +
          'whether the seat is reserved for a defence, PWD, TFWS, orphan or minority ' +
          'candidate. Selecting the wrong category compares you against a completely ' +
          'different set of numbers, so the result would be meaningless.',
      },
      {
        q: 'What does Home University mean, and does it matter?',
        a:
          'Maharashtra reserves a share of seats at each institute for candidates from ' +
          'the university region that institute belongs to. Those Home University ' +
          'seats usually close at a lower cutoff than the same course at State Level, ' +
          'so a student from the right region can get into a course that is out of ' +
          'reach for the same score from elsewhere. The predictor takes this into ' +
          'account when you tell it your scope.',
      },
      {
        q: 'Can I choose more than one branch?',
        a:
          'Yes. Branches are offered as groups rather than as a list of a hundred and ' +
          'twelve course names, and you can pick any combination. Selecting nothing ' +
          'searches everything, which is usually the right first move — students who ' +
          'filter hard on the first attempt often filter out a college they would have ' +
          'happily taken.',
      },
    ],
  },
  {
    heading: 'Reading the result',
    items: [
      {
        q: 'What do good chance, possible and reach mean?',
        a:
          'Good chance means you finished comfortably ahead of the last candidate ' +
          'admitted to that course last year. Possible means you are near that line ' +
          'and it could go either way. Reach means you were behind it, but the course ' +
          'is worth listing as an ambitious option because cutoffs move. They are ' +
          'descriptions of distance from a past cutoff, not probabilities.',
      },
      {
        q: 'Are the predictions guaranteed?',
        a:
          'No, and nobody can honestly offer that. A prediction compares your score ' +
          'with a previous year. Cutoffs shift every year with seat intake, paper ' +
          'difficulty and how many students apply where. Actual allotment also ' +
          'depends on your preference order, eligibility, documents and seat ' +
          'availability, none of which this site can see. Treat the result as a ' +
          'shortlist to research, not as an admission.',
      },
      {
        q: 'A college I want is showing as reach. Should I still put it on my form?',
        a:
          'Usually yes. Ranking a course lower on your preference list costs you ' +
          'nothing if you do not get it, because CAP allots the highest preference it ' +
          'can reach. Leaving a college off the form is the only way to guarantee you ' +
          'will not be allotted it. Use the bands to decide the order of your ' +
          'preferences, not to shorten the list.',
      },
      {
        q: 'Why does the same college appear several times in my results?',
        a:
          'Cutoffs are published per course, per seat type and per round, not per ' +
          'college. A college offering eight branches across three CAP rounds can ' +
          'therefore produce many rows, each one a genuinely different route in with ' +
          'a different closing figure. Filtering by round or by branch group narrows ' +
          'it down.',
      },
    ],
  },
  {
    heading: 'The data',
    items: [
      {
        q: 'Where does CollegeHelper get its cutoff data?',
        a:
          'From the official CAP cutoff documents published by the State Common ' +
          'Entrance Test Cell, Government of Maharashtra, read directly from those ' +
          'PDFs. The documents are named on the data and method page so you can ' +
          'download them and check any figure against the original.',
      },
      {
        q: "Which year's cutoff data is used?",
        a:
          `The ${DATA.academicYear} CAP cutoffs, covering Rounds I, II and III — ` +
          `${DATA.cutoffRows.toLocaleString('en-IN')} cutoff records across ` +
          `${DATA.institutes} institutes. The dataset in use was imported on ` +
          `${DATA.importedOn}. When the CET Cell publishes a new season, the ` +
          `documents are re-read and the year shown on the site changes with them.`,
      },
      {
        q: 'What is CAP, and what is the difference between Round I, II and III?',
        a:
          'CAP is the Centralised Admission Process — the state-run counselling that ' +
          'allots engineering seats in Maharashtra. It runs in rounds. Round I allots ' +
          'against the full set of seats and generally closes at the highest cutoffs. ' +
          'Round II reallocates the seats left over after Round I admissions and ' +
          'cancellations, so cutoffs often fall. Round III works on whatever remains ' +
          'and is where cutoffs are typically lowest and most volatile. The predictor ' +
          'shows all three so you can see which round a course actually opened up in.',
      },
      {
        q: 'What is the difference between a closing rank and a closing percentile?',
        a:
          'They describe the same candidate from two directions. The closing ' +
          'percentile is the score of the last admitted candidate expressed as the ' +
          'percentage of candidates at or below them, so higher is better. The ' +
          'closing rank is that same candidate\u2019s merit number, so lower is ' +
          'better. Both are published officially, and this site never calculates one ' +
          'from the other.',
      },
      {
        q: 'Are fees, placements and rankings shown?',
        a:
          'Only where a person has checked them against a primary source. The CAP ' +
          'documents contain cutoffs and nothing else, so fee, placement and hostel ' +
          'information is added college by college, and a page that does not have it ' +
          'says so instead of filling the space with an estimate. No ratings, reviews ' +
          'or rankings are published, because none have been collected.',
      },
      {
        q: 'I found a cutoff that does not match the official PDF. What should I do?',
        a:
          'Report it. Send the institute code, the course, the CAP round and the seat ' +
          'type, and it will be checked against the source document and corrected. ' +
          'Contact details are on the about page.',
      },
    ],
  },
  {
    heading: 'Access and the site',
    items: [
      {
        q: 'Is CollegeHelper official, or connected to the CET Cell?',
        a:
          'No. CollegeHelper.xyz is an independent site. It is not affiliated with ' +
          'MHT-CET, the State CET Cell, JoSAA, NTA or any college. It reads the ' +
          'documents those bodies publish; it has no role in admissions and cannot ' +
          'influence an allotment.',
      },
      {
        q: 'Do I have to pay to use the predictor?',
        a:
          'It depends on the mode the site is in, which is shown before you enter ' +
          'anything and again before any payment screen. When access is charged for, ' +
          'it is a single payment shown in rupees up front, with no subscription and ' +
          'no automatic renewal. The price and the mode are always displayed before ' +
          'you commit to anything.',
      },
      {
        q: 'I paid but lost access. How do I get back in?',
        a:
          'Use the restore access page with the same email address and phone number ' +
          'you entered at payment, and access is returned to that browser. If that ' +
          'does not work, contact us with the payment details and it will be sorted ' +
          'out by hand.',
      },
      {
        q: 'What data does the site collect about me?',
        a:
          'If you pay, your name, email and phone number, because a purchase has to be ' +
          'attached to somebody. Otherwise, an anonymous browser identifier, the ' +
          'inputs you gave the predictor and how many results came back. There is no ' +
          'third-party advertising or tracking script, and referrers are stored as a ' +
          'domain only. The privacy policy sets this out in full.',
      },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

export default function FaqPage() {
  return (
    <div className="screen pb-6">
      <BreadcrumbJsonLd items={CRUMBS} />
      <FaqJsonLd items={ALL} />
      <Breadcrumbs items={CRUMBS} />

      <PageHeader
        title="Questions students actually ask"
        intro="Answers describing how this site really works, including the parts where the honest answer is that a prediction cannot tell you something."
      />

      <div className="space-y-10">
        {GROUPS.map((group) => (
          <section key={group.heading} className="space-y-3">
            <SectionHead title={group.heading} />
            <dl className="panel divide-rows overflow-hidden">
              {group.items.map((item) => (
                <div key={item.q} className="p-4">
                  <dt className="text-[0.9375rem] font-semibold leading-snug text-ink">
                    {item.q}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
        <Link href="/methodology" className="font-semibold text-brand hover:underline">
          How the data and method work
        </Link>
        <Link href="/" className="font-semibold text-brand hover:underline">
          Try the predictor
        </Link>
        <Link href="/about" className="font-semibold text-brand hover:underline">
          Contact us
        </Link>
      </div>
    </div>
  );
}
