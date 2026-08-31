import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminCollegesPage({
  searchParams,
}: {
  searchParams: { q?: string; state?: string };
}) {
  await requireAdminPage();
  const db = supabaseAdmin();
  const q = (searchParams.q ?? '').trim();

  let query = db
    .from('colleges')
    .select('id, slug, name, city, institute_code, is_published, location_verified, data_completeness')
    .order('name')
    .limit(120);
  if (q) query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,institute_code.ilike.%${q}%`);
  if (searchParams.state === 'draft') query = query.eq('is_published', false);

  const { data } = await query;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-display-sm font-semibold text-ink">Colleges</h2>
      <p className="text-sm text-ink-muted">
        Colleges are imported unpublished. Review the location and details, then publish.
        Unpublished colleges never appear on the site or in predictor results.
      </p>

      <form className="flex gap-2" action="/admin/colleges">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, city or code"
          className="w-full max-w-sm rounded-card border border-rule px-3 py-2 text-sm"
        />
        <button className="rounded-card border border-rule px-3 py-2 text-sm hover:bg-surface">
          Search
        </button>
        <Link
          href="/admin/colleges?state=draft"
          className="rounded-card border border-rule px-3 py-2 text-sm text-ink-muted hover:bg-surface"
        >
          Drafts only
        </Link>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-ink-muted">
              <th className="p-3 font-medium">College</th>
              <th className="p-3 font-medium">Code</th>
              <th className="p-3 font-medium">City</th>
              <th className="p-3 font-medium">Location</th>
              <th className="p-3 font-medium">Data</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-b border-rule/60">
                <td className="p-3 text-ink">{c.name}</td>
                <td className="tnum p-3 text-ink-muted">{c.institute_code}</td>
                <td className="p-3 text-ink-muted">{c.city ?? '\u2014'}</td>
                <td className="p-3 text-xs">
                  {c.location_verified ? (
                    <span className="text-good">verified</span>
                  ) : (
                    <span className="text-possible">derived</span>
                  )}
                </td>
                <td className="p-3 text-xs text-ink-muted">{c.data_completeness}</td>
                <td className="p-3 text-xs">
                  {c.is_published ? (
                    <span className="text-good">published</span>
                  ) : (
                    <span className="text-ink-faint">draft</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-ink-muted">
        Editing college details, fees and campus information is done in the Supabase
        table editor for now \u2014 see the README section &ldquo;Adding a college&rdquo;.
      </p>
    </div>
  );
}
