import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, MapPin } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Disclaimer } from '@/components/ui';
import { AFFILIATION_DISCLAIMER } from '@/lib/predictor';

export const revalidate = 3600;

/**
 * One reusable template for every college. Duplicate nothing to add a college:
 * insert a row and its programs, fill the fields you have, publish it.
 *
 * Sections with no data render as "not added yet" rather than being hidden or
 * filled with plausible-looking numbers. A visitor can always tell the
 * difference between a fact and a gap.
 */

async function getCollege(slug: string) {
  const db = supabaseAdmin();
  const { data: college } = await db
    .from('colleges')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (!college) return null;

  const [programs, facts, fees, cutoffs] = await Promise.all([
    db
      .from('college_programs')
      .select('id, course_code, program_name, intake, duration_years, status, branches(name)')
      .eq('college_id', college.id)
      .eq('is_active', true)
      .order('program_name'),
    db.from('college_facts').select('*').eq('college_id', college.id).order('display_order'),
    db
      .from('program_fees')
      .select('*, college_programs!inner(college_id, program_name)')
      .eq('college_programs.college_id', college.id),
    db
      .from('cutoff_records')
      .select(
        'closing_rank, closing_percentile, seat_type_code, seat_level, stage, ' +
          'cutoff_datasets!inner(cap_round, academic_year, round_order, is_published), ' +
          'college_programs!inner(college_id, program_name)',
      )
      .eq('college_programs.college_id', college.id)
      .eq('cutoff_datasets.is_published', true)
      .order('closing_rank')
      .limit(300),
  ]);

  return {
    college,
    programs: programs.data ?? [],
    facts: facts.data ?? [],
    fees: fees.data ?? [],
    cutoffs: cutoffs.data ?? [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getCollege(params.slug);
  if (!data) return { title: 'College not found' };
  const { college } = data;
  const where = [college.city, college.state].filter(Boolean).join(', ');
  return {
    title: `${college.name}${where ? ` \u2014 ${where}` : ''}`,
    description:
      `Courses, MHT-CET CAP cutoffs and admission information for ${college.name}` +
      `${where ? ` in ${where}` : ''}.`,
    alternates: { canonical: `/colleges/${college.slug}` },
    openGraph: { title: college.name, description: `Courses and MHT-CET cutoffs for ${college.name}.` },
  };
}

const nf = new Intl.NumberFormat('en-IN');

function Section({
  title,
  children,
  empty,
}: {
  title: string;
  children?: React.ReactNode;
  empty?: string;
}) {
  return (
    <section className="border-t border-rule py-8">
      <h2 className="font-display text-display-sm font-semibold text-ink">{title}</h2>
      <div className="mt-4">
        {children ?? <p className="text-sm text-ink-muted">{empty}</p>}
      </div>
    </section>
  );
}

export default async function CollegePage({ params }: { params: { slug: string } }) {
  const data = await getCollege(params.slug);
  if (!data) notFound();
  const { college, programs, facts, fees, cutoffs } = data;

  const factsBy = (section: string) => facts.filter((f: any) => f.section === section);
  const campus = factsBy('campus');
  const placement = factsBy('placement');
  const links = factsBy('links');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollegeOrUniversity',
    name: college.name,
    url: college.website_url ?? undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: college.city ?? undefined,
      addressRegion: college.state ?? 'Maharashtra',
      addressCountry: 'IN',
    },
    identifier: college.institute_code,
  };

  return (
    <div className="container-page max-w-4xl py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-4 text-sm text-ink-muted">
        <Link href="/colleges" className="hover:text-brand">Colleges</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{college.name}</span>
      </nav>

      <header>
        <h1 className="font-display text-display-lg font-semibold text-ink">{college.name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
          {college.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={15} aria-hidden /> {college.city}
              {college.district && college.district !== college.city ? `, ${college.district}` : ''}
            </span>
          )}
          {college.institute_type && <span>&middot; {college.institute_type}</span>}
          <span className="tnum">&middot; Code {college.institute_code}</span>
        </p>
        {!college.location_verified && college.city && (
          <p className="mt-2 text-xs text-ink-faint">
            Location derived from the institute&rsquo;s registered name and not yet verified.
          </p>
        )}
        {college.description && (
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">{college.description}</p>
        )}

        <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ['Affiliation', college.affiliation],
            ['Institute type', college.institute_type],
            ['Established', college.established_year],
            ['Address', college.address],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={String(k)} className="flex gap-2">
                <dt className="shrink-0 text-ink-muted">{k}:</dt>
                <dd className="text-ink">{String(v)}</dd>
              </div>
            ))}
        </dl>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          {college.website_url && (
            <a
              href={college.website_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
            >
              Official website <ExternalLink size={14} aria-hidden />
            </a>
          )}
          {college.admission_url && (
            <a
              href={college.admission_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
            >
              Admission page <ExternalLink size={14} aria-hidden />
            </a>
          )}
          {college.maps_url && (
            <a
              href={college.maps_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
            >
              Map <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </div>
      </header>

      <Section
        title="Courses"
        empty="Courses for this college have not been added yet."
      >
        {programs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-ink-muted">
                  <th className="py-2 pr-4 font-medium">Branch</th>
                  <th className="py-2 pr-4 font-medium">Course code</th>
                  <th className="py-2 pr-4 font-medium">Intake</th>
                  <th className="py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p: any) => (
                  <tr key={p.id} className="border-b border-rule/60">
                    <td className="py-2.5 pr-4 text-ink">{p.branches?.name ?? p.program_name}</td>
                    <td className="tnum py-2.5 pr-4 text-ink-muted">{p.course_code}</td>
                    <td className="tnum py-2.5 pr-4 text-ink-muted">{p.intake ?? '\u2014'}</td>
                    <td className="py-2.5 text-ink-muted">
                      {p.duration_years ? `${p.duration_years} years` : '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="Fees"
        empty="Fee information for this college has not been added yet. Fees are not published in the CAP cutoff documents, so they are entered separately."
      >
        {fees.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-ink-muted">
                  <th className="py-2 pr-4 font-medium">Course</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Year</th>
                  <th className="py-2 font-medium">Total fee</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((f: any) => (
                  <tr key={f.id} className="border-b border-rule/60">
                    <td className="py-2.5 pr-4 text-ink">{f.college_programs?.program_name}</td>
                    <td className="py-2.5 pr-4 text-ink-muted">{f.category_group}</td>
                    <td className="tnum py-2.5 pr-4 text-ink-muted">{f.academic_year}</td>
                    <td className="tnum py-2.5 text-ink">
                      {f.total_fee ? `\u20B9${nf.format(f.total_fee)}` : '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="MHT-CET cutoffs"
        empty="No published cutoff data for this college yet."
      >
        {cutoffs.length > 0 && (
          <>
            <p className="mb-3 text-sm text-ink-muted">
              Every row states its academic year and CAP round. Rounds are never
              combined into a single figure.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rule text-left text-ink-muted">
                    <th className="py-2 pr-4 font-medium">Year</th>
                    <th className="py-2 pr-4 font-medium">Round</th>
                    <th className="py-2 pr-4 font-medium">Branch</th>
                    <th className="py-2 pr-4 font-medium">Seat type</th>
                    <th className="py-2 pr-4 font-medium">Closing rank</th>
                    <th className="py-2 font-medium">Closing percentile</th>
                  </tr>
                </thead>
                <tbody>
                  {cutoffs.map((c: any, i: number) => (
                    <tr key={i} className="border-b border-rule/60">
                      <td className="tnum py-2.5 pr-4 text-ink-muted">
                        {c.cutoff_datasets?.academic_year}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-muted">{c.cutoff_datasets?.cap_round}</td>
                      <td className="py-2.5 pr-4 text-ink">{c.college_programs?.program_name}</td>
                      <td className="tnum py-2.5 pr-4 text-ink-muted" title={c.seat_level}>
                        {c.seat_type_code}
                      </td>
                      <td className="tnum py-2.5 pr-4 text-ink">
                        {c.closing_rank != null ? nf.format(c.closing_rank) : '\u2014'}
                      </td>
                      <td className="tnum py-2.5 text-ink">
                        {c.closing_percentile != null ? Number(c.closing_percentile).toFixed(4) : '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      <Section
        title="Campus"
        empty="Campus information for this college has not been added yet."
      >
        {campus.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {campus.map((f: any) => (
              <div key={f.id}>
                <dt className="text-sm font-medium text-ink">{f.key}</dt>
                <dd className="text-sm leading-relaxed text-ink-muted">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      <Section
        title="Placements"
        empty="Placement information for this college has not been added yet."
      >
        {placement.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {placement.map((f: any) => (
              <div key={f.id}>
                <dt className="text-sm font-medium text-ink">
                  {f.key}
                  {f.academic_year ? ` (${f.academic_year})` : ''}
                </dt>
                <dd className="text-sm text-ink-muted">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      {links.length > 0 && (
        <Section title="Important links">
          <ul className="space-y-2 text-sm">
            {links.map((f: any) => (
              <li key={f.id}>
                <a
                  href={f.value ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
                >
                  {f.key} <ExternalLink size={14} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="border-t border-rule pt-8">
        <Disclaimer>
          CollegeHelper is an independent information platform and is not affiliated
          with this college or with the MHT-CET authorities. {AFFILIATION_DISCLAIMER}
        </Disclaimer>
      </div>
    </div>
  );
}
