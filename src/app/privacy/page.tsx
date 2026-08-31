import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, PageHeader, Prose, SectionHead } from '@/components/ui';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { CONTACT, DATA, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'Exactly what CollegeHelper.xyz stores, why, how long it is kept, who it ' +
    'is shared with, and how to have it deleted.',
  alternates: { canonical: '/privacy' },
};

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Privacy policy', path: '/privacy' },
];

/**
 * Written against the code rather than from a template.
 *
 * Every table, cookie and third party named below exists in this repository.
 * Nothing is claimed that the application does not do, and nothing it does do
 * is left out — including the things that are inconvenient to admit, such as
 * IP addresses appearing in the rate-limiting records.
 */
export default function PrivacyPage() {
  return (
    <div className="screen pb-6">
      <BreadcrumbJsonLd items={CRUMBS} />
      <Breadcrumbs items={CRUMBS} />

      <PageHeader
        title="Privacy policy"
        intro={`What ${SITE_NAME} stores about you, why it is stored, and how to get rid of it.`}
        meta={<p className="text-[0.8125rem] text-ink-faint">Last updated {DATA.importedOn}</p>}
      />

      <div className="space-y-10">
        <section className="space-y-4">
          <SectionHead title="The short version" />
          <Prose>
            <p>
              There is no advertising network on this site, no third-party
              analytics script, and nothing is sold or shared for marketing. If
              you never pay, nothing that identifies you personally is collected.
              If you do pay, your name, email and phone number are stored because
              a purchase has to belong to somebody and you have to be able to get
              your access back.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="What is collected, and when" />
          <Prose>
            <h3>If you only use the site</h3>
            <ul>
              <li>
                <strong>An anonymous browser identifier.</strong> A random value
                stored in a cookie named <span className="tnum">ch_anon</span>. It
                is not linked to your name or email and is not shared with anyone.
                It exists so that one person clicking through five pages is not
                counted as five people.
              </li>
              <li>
                <strong>What you asked the predictor.</strong> The percentile or
                rank you entered, your category, gender, chosen branch groups and
                CAP rounds, and how many results came back. This is kept to see
                which inputs return nothing useful, which is how the filters get
                fixed.
              </li>
              <li>
                <strong>Basic usage events.</strong> Which page was viewed, and the
                domain that referred you — <em>example.com</em>, never the full
                referring URL. Page paths on this site contain no personal
                information.
              </li>
            </ul>

            <h3>If you pay for predictor access</h3>
            <ul>
              <li>
                <strong>Your name, email address and phone number</strong>, entered
                by you on the payment step. The email and phone are also what the
                restore-access page checks, so access can be returned if you clear
                your cookies or change device.
              </li>
              <li>
                <strong>Payment records.</strong> The Razorpay order and payment
                identifiers, the amount, the currency and the status. Your card,
                UPI ID, bank details and CVV are entered on Razorpay&rsquo;s own
                checkout and are never sent to or stored by this site.
              </li>
              <li>
                <strong>Your access grant.</strong> A record that a purchase
                entitles you to results, when it was created, and whether it has
                been revoked or refunded.
              </li>
            </ul>

            <h3>Security records</h3>
            <ul>
              <li>
                <strong>Rate-limiting entries.</strong> To stop somebody
                brute-forcing the restore-access form, attempts are counted per
                network address and per email address. Those identifiers are stored
                only as an irreversible hash, together with a timestamp.
              </li>
            </ul>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="Cookies" />
          <Prose>
            <p>
              Two cookies, both set by this site, both server-side and not readable
              by JavaScript in your browser. Neither is an advertising cookie.
            </p>
            <ul>
              <li>
                <span className="tnum">ch_anon</span> — the anonymous identifier
                described above. Expires after one year.
              </li>
              <li>
                <span className="tnum">ch_access</span> — a signed token proving
                you have paid, so the results page loads without asking again.
                Expires after thirty days. Deleting it does not delete your
                purchase; the restore-access page brings it back.
              </li>
            </ul>
            <p>
              Fonts are served from this site rather than from Google Fonts, so
              loading a page does not tell Google that you visited.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="Who else sees it" />
          <Prose>
            <p>Three companies, each doing one job:</p>
            <ul>
              <li>
                <strong>Razorpay</strong> processes payments. It receives your
                name, email and phone number for the transaction, and it — not this
                site — handles your payment instrument.
              </li>
              <li>
                <strong>Supabase</strong> hosts the database in which the records
                above are stored.
              </li>
              <li>
                <strong>The hosting provider</strong> serves the pages, and keeps
                short-lived server logs as any web host does.
              </li>
            </ul>
            <p>
              Nobody else. No data broker, no advertising network, no mailing-list
              provider, and no sale of information to colleges, coaching classes or
              consultants.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="How long it is kept" />
          <Prose>
            <ul>
              <li>
                Payment and access records are kept while the purchase is
                meaningful and for as long afterwards as tax and accounting rules
                require.
              </li>
              <li>
                Predictor inputs and usage events are kept in aggregate to improve
                the tool, and are not tied to your name unless you paid.
              </li>
              <li>Rate-limiting entries are only useful for hours and are cleared.</li>
            </ul>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="Your choices" />
          <Prose>
            <p>You can ask for:</p>
            <ul>
              <li>a copy of what is stored about you;</li>
              <li>a correction, if a detail is wrong;</li>
              <li>
                deletion of your personal details. Payment records that must be
                retained for accounting are the exception, and deleting your
                account ends your access.
              </li>
            </ul>
            <p>
              Clearing your browser cookies removes both cookies immediately.
              {CONTACT.email ? (
                <>
                  {' '}
                  For anything else, email{' '}
                  <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> from the
                  address you used, and say what you want done.
                </>
              ) : (
                <>
                  {' '}
                  For anything else, use the contact details on the{' '}
                  <Link href="/about">about page</Link>.
                </>
              )}
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="Children" />
          <Prose>
            <p>
              This site is built for MHT-CET candidates, many of whom are under
              eighteen. It collects no more from them than from anyone else, and
              the payment step should be completed by a parent or guardian where
              that is required. No profiling or advertising is carried out on any
              visitor, of any age.
            </p>
          </Prose>
        </section>

        <section className="space-y-4">
          <SectionHead title="Changes" />
          <Prose>
            <p>
              If what is collected changes, this page changes with it and the date
              at the top moves. Material changes will be noted on the site rather
              than made quietly.
            </p>
          </Prose>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
        <Link href="/terms" className="font-semibold text-brand hover:underline">
          Terms of use
        </Link>
        <Link href="/disclaimer" className="font-semibold text-brand hover:underline">
          Disclaimer
        </Link>
        <Link href="/about" className="font-semibold text-brand hover:underline">
          Contact
        </Link>
      </div>
    </div>
  );
}
