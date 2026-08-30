import { requireAdminPage } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const nf = new Intl.NumberFormat('en-IN');

export default async function AdminCutoffsPage({
  searchParams,
}: {
  searchParams: { round?: string; category?: string; college?: string };
}) {
  await requireAdminPage();
  const db = supabaseAdmin();

  const { data: datasets } = await db
    .from('cutoff_datasets')
    .select('*')
    .order('academic_year', { ascending: false })
    .order('round_order');

  let q = db
    .from('cutoff_records')
    .select(
      'id, seat_type_code, seat_level, stage, closing_rank, closing_percentile, ' +
        'cutoff_datasets!inner(cap_round, academic_year), ' +
        'college_programs!inner(program_name, colleges!inner(name, institute_code))',
    )
    .limit(100);
  if (searchParams.round) q = q.eq('cutoff_datasets.cap_round', searchParams.round);
  if (searchParams.category) q = q.eq('seat_type_code', searchParams.category);
  const { data: sample } = await q;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-display-sm font-semibold text-ink">Cutoff data</h2>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-ink-muted">
              <th className="p-3 font-medium">Year</th>
              <th className="p-3 font-medium">Round</th>
              <th className="p-3 font-medium">Records</th>
              <th className="p-3 font-medium">Source document</th>
              <th className="p-3 font-medium">Imported</th>
              <th className="p-3 font-medium">Published</th>
            </tr>
          </thead>
          <tbody>
            {(datasets ?? []).map((d: any) => (
              <tr key={d.id} className="border-b border-rule/60">
                <td className="tnum p-3 text-ink">{d.academic_year}</td>
                <td className="p-3 text-ink">{d.cap_round}</td>
                <td className="tnum p-3 text-ink-muted">{nf.format(d.record_count)}</td>
                <td className="p-3 text-xs text-ink-faint">{d.source_document ?? '\u2014'}</td>
                <td className="p-3 text-ink-muted">
                  {new Date(d.imported_at).toLocaleDateString('en-IN')}
                </td>
                <td className="p-3">
                  {d.is_published ? (
                    <span className="rounded-full bg-good-tint px-2 py-0.5 text-xs text-good">
                      live
                    </span>
                  ) : (
                    <span className="rounded-full bg-possible-tint px-2 py-0.5 text-xs text-possible">
                      draft
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!(datasets ?? []).length && (
          <p className="p-6 text-sm text-ink-muted">
            No cutoff datasets imported yet. Run{' '}
            <code className="tnum">npm run import:cutoffs</code> to load them.
          </p>
        )}
      </div>

      <div>
        <h3 className="font-medium text-ink">Sample records</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Showing up to 100 rows. Filter with ?round= and ?category= in the URL.
        </p>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-muted">
                <th className="p-3 font-medium">College</th>
                <th className="p-3 font-medium">Branch</th>
                <th className="p-3 font-medium">Round</th>
                <th className="p-3 font-medium">Seat type</th>
                <th className="p-3 font-medium">Stage</th>
                <th className="p-3 font-medium">Closing rank</th>
                <th className="p-3 font-medium">Closing percentile</th>
              </tr>
            </thead>
            <tbody>
              {(sample ?? []).map((r: any) => (
                <tr key={r.id} className="border-b border-rule/60">
                  <td className="p-3 text-ink">{r.college_programs?.colleges?.name}</td>
                  <td className="p-3 text-ink-muted">{r.college_programs?.program_name}</td>
                  <td className="p-3 text-ink-muted">{r.cutoff_datasets?.cap_round}</td>
                  <td className="tnum p-3 text-ink-muted" title={r.seat_level}>
                    {r.seat_type_code}
                  </td>
                  <td className="p-3 text-ink-muted">{r.stage ?? '\u2014'}</td>
                  <td className="tnum p-3 text-ink">
                    {r.closing_rank != null ? nf.format(r.closing_rank) : '\u2014'}
                  </td>
                  <td className="tnum p-3 text-ink">
                    {r.closing_percentile != null
                      ? Number(r.closing_percentile).toFixed(4)
                      : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
