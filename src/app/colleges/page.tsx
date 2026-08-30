import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CollegeSearchBox } from '@/components/college/search-box';
import { EmptyState } from '@/components/ui';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Engineering colleges in Maharashtra',
  description:
    'Browse Maharashtra engineering colleges with courses, location and MHT-CET CAP cutoff data.',
  alternates: { canonical: '/colleges' },
};

const PAGE_SIZE = 24;

export default async function CollegesPage({
  searchParams,
}: {
  searchParams: { q?: string; city?: string; type?: string; page?: string };
}) {
  const db = supabaseAdmin();
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const q = (searchParams.q ?? '').trim();

  let query = db
    .from('colleges')
    .select('id, slug, name, city, district, institute_type, institute_code', {
      count: 'exact',
    })
    .eq('is_published', true);

  if (q) {
    // Institute code is an exact 5-digit lookup; everything else is fuzzy.
    query = /^\d{3,5}$/.test(q)
      ? query.ilike('institute_code', `%${q}%`)
      : query.or(`name.ilike.%${q}%,city.ilike.%${q}%,district.ilike.%${q}%`);
  }
  if (searchParams.city) query = query.eq('city', searchParams.city);
  if (searchParams.type) query = query.eq('institute_type', searchParams.type);

  const { data, count } = await query
    .order('name')
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-display-lg font-semibold text-ink">Colleges</h1>
      <p className="mt-2 text-ink-muted">
        Search by college name, city, district or institute code.
      </p>

      <div className="mt-5">
        <CollegeSearchBox initial={q} />
      </div>

      {total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={q ? `No colleges matched \u201C${q}\u201D` : 'No colleges published yet'}
            body={
              q
                ? 'Try a shorter search, or the city name on its own.'
                : 'Colleges appear here once they have been reviewed and published from the admin panel.'
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-muted">
            {total.toLocaleString('en-IN')} college{total === 1 ? '' : 's'}
            {q ? ` matching \u201C${q}\u201D` : ''}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(data ?? []).map((c: any) => (
              <li key={c.id}>
                <Link href={`/colleges/${c.slug}`} className="card block p-4 hover:border-brand-ring">
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {[c.city, c.district !== c.city ? c.district : null, c.institute_type]
                      .filter(Boolean)
                      .join(' \u00B7 ')}
                  </p>
                  <p className="tnum mt-2 text-xs text-ink-faint">Code {c.institute_code}</p>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
              {page > 1 ? (
                <Link
                  href={`/colleges?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Previous
                </Link>
              ) : <span />}
              <span className="text-sm text-ink-muted">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link
                  href={`/colleges?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Next
                </Link>
              ) : <span />}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
