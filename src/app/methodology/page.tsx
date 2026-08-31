import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, Disclaimer, PageHeader, Prose, SectionHead, Tag } from '@/components/ui';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { AFFILIATION_DISCLAIMER } from '@/lib/predictor';
import { DATA } from '@/lib/site';

export const metadata: Metadata = {
  title: 'How the cutoff data and predictions work',
  description:
    'Which documents the MHT-CET cutoff figures come from, what a closing ' +
    'percentile and a closing rank actually mean, how the good chance, ' +
    'possible and reach bands are calculated, and where the method stops ' +
    'being reliable.',
  alternates: { canonical: '/methodology' },
};

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Data and method', path: '/methodology' },
];

/**
 * The page that makes the rest of the site checkable.
 *
 * Every figure quoted here is from DATA_PIPELINE.md, which records the actual
 * extraction run: the documents, the row counts and the checks that were
 * carried out against them. A student can take any cutoff off this site,
 * open the named PDF, and find the same number. That is the whole point of
 * publishing it.
 */
export default function MethodologyPage() {
  const totalRows = DATA.documents.reduce((n, d) => n + d.rows, 0);

  return (
    <div className="screen pb-6">
      <BreadcrumbJsonLd items={CRUMBS} />
      <Breadcrumbs items={CRUMBS} />

      <PageHeader
        title="Where the numbers come from"
        intro="Every cutoff on this site was read out of an official CAP document. This page names the documents, explains what the figures mean, and says plainly what the prediction cannot tell you."
        meta={
          <div className="flex flex-wrap gap-2">
            <Tag tone="brand">{DATA.academicYear} CAP data</Tag>
            <Tag>Imported {DATA.importedOn}</Tag>
            <Tag>{DATA.cutoffRows.toLocaleString('en-IN')} rows</Tag>
          </div>
        }
      />

      <section className="space-y-4 pt-2">
        <SectionHead title="The source documents" id="sources" />
        <Prose>
          <p>
            The State Common Entrance Test Cell publishes a cutoff document after
            each round of Centralised Admission Process counselling. It lists, for
            every institute and every course, the last candidate admitted under
            each seat type — their merit rank and their percentile. Those documents
            are the only input to the cutoff figures on this site. Nothing is
            averaged with data from anywhere else, and nothing is bought in from a
            third party.
          </p>
        </Prose>

        <ul className="panel divide-rows overflow-hidden">
          {DATA.documents.map((d) => (
            <li key={d.file} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4">
              <span>
                <span className="block text-[0.9375rem] font-semibold text-ink">{d.round}</span>
                <span className="tnum mt-0.5 block break-all text-xs text-ink-faint">{d.file}</span>
              </span>
              <span className="tnum text-sm text-ink-muted">
                {d.rows.toLocaleString('en-IN')} rows
              </span>
            </li>
          ))}
        </ul>

        <Prose>
          <p>
            That is {totalRows.toLocaleString('en-IN')} cutoff records across{' '}
            {DATA.institutes} institutes and {DATA.programs.toLocaleString('en-IN')}{' '}
            courses, covering {DATA.seatTypes} seat-type codes, taken from{' '}
            {DATA.pagesProcessed.toLocaleString('en-IN')} pages. The documents are
            published by the{' '}
            <a href={DATA.publisherUrl} target="_blank" rel="noopener noreferrer">
              {DATA.publisher}
            </a>
            . Download them there and check any figure on this site against the
            original.
          </p>
        </Prose>
      </section>

      <section className="mt-10 space-y-4">
        <SectionHead title="What a closing cutoff actually is" id="meaning" />
        <Prose>
          <p>
            A closing cutoff is a record of what happened, not a threshold set in
            advance. It is the rank and percentile of the <strong>last candidate
            who accepted a seat</strong> in that course, under that seat type, in
            that round. Nobody decided it. It fell out of how many people applied,
            what they preferred, and how many seats there were.
          </p>
          <p>
            Each row carries two figures and they are not interchangeable:
          </p>
          <ul>
            <li>
              <strong>Closing percentile</strong> — your MHT-CET score expressed as
              the percentage of candidates you finished at or above. Higher is
              better. 99.42 means roughly the top 0.58 per cent.
            </li>
            <li>
              <strong>Closing rank</strong> — the merit number in the CAP list.
              Lower is better. This is the merit rank from your CAP allotment
              documents, not your position in a coaching class test.
            </li>
          </ul>
          <p>
            The predictor never converts one into the other. The official lists
            publish both, and deriving a rank from a percentile would produce a
            number that looks precise and is a guess. If you enter a percentile,
            you are compared against closing percentiles only; if you enter a merit
            rank, against closing ranks only. Rows that have no value in the mode
            you chose are left out of the result rather than estimated.
          </p>
          <p>
            Each row also carries a <strong>seat type</strong> (your category,
            gender and whether the seat is reserved for a defence, PWD, TFWS,
            orphan or minority candidate), a <strong>seat level</strong> (Home
            University, Other Than Home University, State Level, All India,
            Minority) and a <strong>stage</strong>. Those three decide which rows
            are yours. A GOPENS figure at a Pune college is irrelevant to an
            OBC candidate from Nagpur, which is why the form asks for category and
            university scope before it shows you anything.
          </p>
        </Prose>
      </section>

      <section className="mt-10 space-y-4">
        <SectionHead title="How the extraction was checked" id="verification" />
        <Prose>
          <p>
            The cutoff documents are wide tables in PDF, and reading them
            mechanically goes wrong in specific ways. Three of them mattered:
          </p>
          <ul>
            <li>
              <strong>Continuation pages.</strong> Tables too wide for a page put
              the remaining columns on the next page with no headers. Fourteen
              pages did this. Missing them would have silently dropped the most
              competitive colleges&rsquo; figures.
            </li>
            <li>
              <strong>Columns match by position, not by order.</strong> A stage
              often publishes values for only some of the categories in its
              header, so the third number is not the third category. Values are
              matched by their horizontal position on the page.
            </li>
            <li>
              <strong>Stage labels wrap.</strong> &ldquo;I-Non&rdquo; on one line
              and &ldquo;PWD&rdquo; on the next is a single label,{' '}
              <span className="tnum">I-Non PWD</span>. About 6,700 rows in Rounds
              II and III are affected.
            </li>
          </ul>
          <p>
            Extracted row counts were then checked against an independent count of
            percentile tokens taken from the same PDFs with different software:
            36,059, 34,391 and 19,839 for the three rounds, matching exactly.
            Three deliberately awkward records were also read off the PDF by hand
            and compared. The extractor reports anything it cannot align rather
            than guessing; that report came back empty, with {DATA.anomalies}{' '}
            anomalies and no blocks dropped.
          </p>
        </Prose>
      </section>

      <section className="mt-10 space-y-4">
        <SectionHead title="How a prediction is produced" id="prediction" />
        <Prose>
          <p>
            There is no model and no machine learning. The calculation is a
            comparison, and it is deliberately simple enough to explain in a
            paragraph.
          </p>
          <ul>
            <li>
              Rows are first filtered to the seat types that apply to you —
              category, gender, and Home University or otherwise — and to the
              rounds and branch groups you selected.
            </li>
            <li>
              For each remaining row, your figure is compared with that row&rsquo;s
              closing figure. In percentile mode the margin is your percentile
              minus the closing percentile. In rank mode it is the closing rank
              minus your rank. Either way, a positive margin means you finished
              ahead of the last candidate admitted.
            </li>
            <li>
              The margin decides the band. Comfortably ahead is{' '}
              <strong>good chance</strong>; close to the line, on either side, is{' '}
              <strong>possible</strong>; behind it is <strong>reach</strong>. In
              rank mode the thresholds are proportions of the closing rank rather
              than fixed numbers, so the same setting behaves sensibly at a cutoff
              of 900 and at a cutoff of 190,000.
            </li>
            <li>
              Results are sorted by band, and within a band by how competitive the
              course is — not by how easily you clear it. The most selective
              college you have a real shot at appears first, because that is the
              one you are trying to find.
            </li>
          </ul>
        </Prose>
      </section>

      <section className="mt-10 space-y-4">
        <SectionHead title="What this cannot tell you" id="limits" />
        <Prose>
          <p>
            The comparison is against a previous year. It is evidence, not a
            forecast, and there are real reasons it will be wrong for some
            students:
          </p>
          <ul>
            <li>
              Cutoffs move every year. Seat intake changes, new institutes are
              approved, a branch becomes fashionable, the paper is harder. A
              course that closed at 96.2 last year can close two points either side
              of that this year.
            </li>
            <li>
              Allotment depends on your preference list. CAP allots the highest
              preference it can reach, so a course you had a good chance at but
              ranked twelfth may never be offered to you.
            </li>
            <li>
              Eligibility rules are not modelled. Domicile, subject combinations,
              minimum marks, documentation and category certificate validity are
              decided by the CET Cell, and this site checks none of them.
            </li>
            <li>
              Institute-level location is derived from each institute&rsquo;s
              registered name, which is all the cutoff documents carry. It is
              filled in for most colleges and blank for the rest, and is not a
              confirmed address.
            </li>
            <li>
              Fees, placements, hostels and infrastructure are not in these
              documents. Where a college page shows them, a person checked them
              against a primary source; where it does not, the page says so rather
              than filling the space.
            </li>
          </ul>
          <p>
            Use the result as a shortlist to research and to order your preference
            form sensibly. Do not use it as a reason to leave a college off that
            form.
          </p>
        </Prose>
      </section>

      <section className="mt-10 space-y-4">
        <SectionHead title="Corrections" id="corrections" />
        <Prose>
          <p>
            If a figure here does not match the official document, that is a bug
            and we want to know. Tell us the institute code, the course, the round
            and the seat type, and it will be checked against the source PDF and
            corrected.{' '}
            <Link href="/about">Contact details are on the about page.</Link>
          </p>
        </Prose>
        <Disclaimer>{AFFILIATION_DISCLAIMER}</Disclaimer>
      </section>

      <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
        <Link href="/" className="font-semibold text-brand hover:underline">
          Try the predictor
        </Link>
        <Link href="/faq" className="font-semibold text-brand hover:underline">
          Frequently asked questions
        </Link>
        <Link href="/colleges" className="font-semibold text-brand hover:underline">
          Browse all {DATA.institutes} colleges
        </Link>
      </div>
    </div>
  );
}
