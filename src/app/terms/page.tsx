import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, Disclaimer, PageHeader, Prose, SectionHead } from '@/components/ui';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { AFFILIATION_DISCLAIMER } from '@/lib/predictor';
import { CONTACT, DATA, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of use',
  description:
    'The terms on which CollegeHelper.xyz is provided: what the predictor is, ' +
    'what paid access includes, refunds, acceptable use, and the limits of ' +
    'liability.',
  alternates: { canonical: '/terms' },
};

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Terms of use', path: '/terms' },
];

export default function TermsPage() {
  return (
    <div className="screen pb-6">
      <BreadcrumbJsonLd items={CRUMBS} />
      <Breadcrumbs items={CRUMBS} />

      <PageHeader
        title="Terms of use"
        intro={`The terms on which ${SITE_NAME} is provided. They describe what the site actually does, not what a template says a website does.`}
        meta={<p className="text-[0.8125rem] text-ink-faint">Last updated {DATA.importedOn}</p>}
      />

      <div className="space-y-10">
        <section className="space-y-4">
          <SectionHead title="1. What this site is" />
          <Prose>
            <p>
              {SITE_NAME} is an independent information tool. It reads the official
              CAP cutoff documents published by the State Common Entrance Test
              Cell and compares your MHT-CET percentile or merit rank against them.
              It does not conduct admissions, allot seats, hold seats, influence
              counselling, or represent any college. Using it does not create any
              application, registration or claim to a seat.
            </p>
          </Prose>
          <Disclaimer>{AFFILIATION_DISCLAIMER}</Disclaimer>
        </section>

        <section className="space-y-4">
          <SectionHead title="2. Predictions are estimates" />
          <Prose>
            <p>
              Every result is a comparison with a previous year&rsquo;s closing
              figures. Cutoffs move, seat intake changes, and allotment depends on
              your preference order, your eligibility and your documents — none of
              which this site can verify. A result labelled <strong>good chance</strong>{' '}
              is not an offer, and a result labelled <strong>reach</strong> is not a
              refusal. You are responsible for the choices you make on your CAP
              preference form, and you should confirm anything that matters against
              the official CET Cell notifications before relying on it.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="3. Accuracy of the data" />
          <Prose>
            <p>
              The cutoff figures are extracted from the official documents and were
              checked against those documents, and the method is published in full
              on the <Link href="/methodology">data and method page</Link>. That
              said, no extraction of thousands of pages is guaranteed error-free.
              Where a figure on this site and the official document disagree, the
              official document is correct. Report the discrepancy and it will be
              fixed.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="4. Paid access" />
          <Prose>
            <p>
              The predictor is sometimes offered free and sometimes for a single
              payment. Which applies, and the exact amount in rupees, is shown
              before you enter any payment details.
            </p>
            <ul>
              <li>
                Payment is a <strong>one-off charge for access to your prediction
                results</strong>. It is not a subscription, nothing renews
                automatically, and no payment instrument is stored for future use.
              </li>
              <li>
                The amount charged is set on the server. The price shown to you is
                the price charged.
              </li>
              <li>
                Payment is processed by Razorpay. Access is granted only after the
                payment is verified on the server, so a failed or abandoned payment
                cannot unlock results.
              </li>
              <li>
                Access is tied to the email address and phone number you enter at
                payment. If you lose it, the{' '}
                <Link href="/restore-access">restore access</Link> page returns it
                using those same details.
              </li>
              <li>
                Buying access does not buy a seat, a recommendation, an application,
                or contact with any college.
              </li>
            </ul>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="5. Refunds and cancellation" />
          <Prose>
            <p>
              Access is delivered immediately once payment is verified, so there is
              nothing to cancel afterwards. If you were charged and did not receive
              access, or were charged more than once for the same purchase, contact
              us with the payment reference and it will be refunded.
            </p>
            <p>
              Refunds are issued through Razorpay to the original payment method.
              When a refund is processed, the corresponding access is withdrawn
              automatically.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="6. Acceptable use" />
          <Prose>
            <p>Please do not:</p>
            <ul>
              <li>
                share, resell or republish paid results as your own product, or
                pass your access to others in bulk;
              </li>
              <li>
                scrape, crawl or otherwise extract the cutoff data wholesale. The
                underlying documents are public — take them from the CET Cell
                directly, which is where they belong;
              </li>
              <li>
                attempt to bypass payment, interfere with the service, or probe it
                for vulnerabilities without telling us. If you find one, report it
                and it will be taken seriously.
              </li>
            </ul>
            <p>
              Access obtained or used in breach of these terms may be withdrawn.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="7. Availability" />
          <Prose>
            <p>
              The site is provided as it is, without a guarantee of uninterrupted
              availability. Admission seasons are exactly when a service is under
              the most load, and while it is built to hold up, no promise of
              constant uptime is made.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="8. Limitation of liability" />
          <Prose>
            <p>
              To the extent the law allows, {SITE_NAME} is not liable for admission
              outcomes, missed deadlines, or decisions made on the basis of a
              prediction. Where liability cannot be excluded, it is limited to the
              amount you paid for access. Nothing here limits liability for fraud
              or for anything that cannot lawfully be limited.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="9. Governing law" />
          <Prose>
            <p>
              These terms are governed by the laws of India, and the courts of
              Maharashtra have jurisdiction over any dispute arising from them.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="10. Contact" />
          <Prose>
            <p>
              {CONTACT.email ? (
                <>
                  Questions about these terms, refunds or anything else:{' '}
                  <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
                </>
              ) : (
                <>
                  Contact details are on the <Link href="/about">about page</Link>.
                </>
              )}{' '}
              Operated by {CONTACT.operator}.
            </p>
          </Prose>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
        <Link href="/privacy" className="font-semibold text-brand hover:underline">
          Privacy policy
        </Link>
        <Link href="/disclaimer" className="font-semibold text-brand hover:underline">
          Disclaimer
        </Link>
        <Link href="/methodology" className="font-semibold text-brand hover:underline">
          Data and method
        </Link>
      </div>
    </div>
  );
}
