import Link from 'next/link';
import { Search, Database, ListChecks, MapPin } from 'lucide-react';
import { ButtonLink, Card } from '@/components/ui';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import { QuickPredictorForm } from '@/components/predictor/quick-form';
import { CollegeSearchBox } from '@/components/college/search-box';

export const revalidate = 600;

/**
 * Homepage counts come from the database rather than being written into the
 * copy, so they can never drift from what was actually imported.
 */
async function getStats() {
  const db = supabaseAdmin();
  const [colleges, cutoffs, rounds] = await Promise.all([
    db.from('colleges').select('id', { count: 'exact', head: true }).eq('is_published', true),
    db.from('cutoff_records').select('id', { count: 'exact', head: true }),
    db.from('cutoff_datasets').select('cap_round').eq('is_published', true),
  ]);
  return {
    colleges: colleges.count ?? 0,
    cutoffs: cutoffs.count ?? 0,
    rounds: rounds.data?.length ?? 0,
  };
}

export default async function HomePage() {
  const [settings, stats] = await Promise.all([getSettings(), getStats()]);
  const nf = new Intl.NumberFormat('en-IN');

  return (
    <>
      <section className="border-b border-rule bg-gradient-to-b from-brand-tint/60 to-white">
        <div className="container-page py-14 sm:py-20">
          <p className="text-sm font-medium uppercase tracking-wide text-brand">
            MHT-CET {settings.activeYear} admissions
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-display-lg font-semibold text-ink sm:text-5xl">
            Find the right college with confidence.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-muted">
            Explore college information and discover MHT-CET colleges based on
            your percentile or merit rank.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/college-predictor" size="lg">
              Find my colleges
            </ButtonLink>
            <ButtonLink href="/colleges" variant="secondary" size="lg">
              Explore colleges
            </ButtonLink>
          </div>

          {stats.cutoffs > 0 && (
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <dt className="text-sm text-ink-muted">Cutoff records</dt>
                <dd className="tnum text-2xl font-medium text-ink">{nf.format(stats.cutoffs)}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">CAP rounds</dt>
                <dd className="tnum text-2xl font-medium text-ink">{stats.rounds}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">Colleges listed</dt>
                <dd className="tnum text-2xl font-medium text-ink">{nf.format(stats.colleges)}</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      <section className="container-page py-12">
        <div className="card overflow-hidden">
          <div className="border-b border-rule bg-surface px-5 py-4 sm:px-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              MHT-CET College Predictor
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Enter either your percentile or your merit rank \u2014 whichever you have.
              You do not need both.
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <QuickPredictorForm />
          </div>
        </div>
      </section>

      <section className="container-page pb-12">
        <h2 className="font-display text-display-sm font-semibold text-ink">Search colleges</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Search by college name, city, district or institute code.
        </p>
        <div className="mt-4">
          <CollegeSearchBox />
        </div>
      </section>

      <section className="container-page pb-16">
        <h2 className="font-display text-display-sm font-semibold text-ink">
          Why CollegeHelper
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: Database,
              title: 'Cutoffs from the official CAP lists',
              body: 'Every cutoff is imported from the published CAP Round I, II and III documents, with the round and year shown on each row.',
            },
            {
              icon: ListChecks,
              title: 'Structured college information',
              body: 'Courses, fees and campus details are organised per college, and each page states what has been filled in and what has not.',
            },
            {
              icon: Search,
              title: 'Easy college discovery',
              body: 'Filter by city, branch and institute type without wading through a PDF of several thousand pages.',
            },
            {
              icon: MapPin,
              title: 'Results tuned to you',
              body: 'Your category, gender, preferred branches and preferred cities all narrow the list to options that actually apply to you.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <Icon className="text-brand" size={22} aria-hidden />
              <h3 className="mt-3 font-medium text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-muted">
          Prefer to browse first?{' '}
          <Link href="/colleges" className="font-medium text-brand hover:underline">
            Explore all colleges
          </Link>
          .
        </p>
      </section>
    </>
  );
}
