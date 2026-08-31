import { requireAdminPage } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('en-IN');
const since = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  await requireAdminPage();
  const db = supabaseAdmin();

  let q = db
    .from('payments')
    .select(
      'id, amount_paise, status, razorpay_order_id, razorpay_payment_id, created_at, ' +
        'app_users(name, email, phone)',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (searchParams.status) q = q.eq('status', searchParams.status);

  const [rows, all, today, yesterday, week, month] = await Promise.all([
    q,
    db.from('payments').select('amount_paise, status'),
    db.from('payments').select('amount_paise').eq('status', 'paid').gte('created_at', since(1)),
    db
      .from('payments')
      .select('amount_paise')
      .eq('status', 'paid')
      .gte('created_at', since(2))
      .lt('created_at', since(1)),
    db.from('payments').select('amount_paise').eq('status', 'paid').gte('created_at', since(7)),
    db.from('payments').select('amount_paise').eq('status', 'paid').gte('created_at', since(30)),
  ]);

  const sum = (r: any[] | null) => (r ?? []).reduce((t, x) => t + (x.amount_paise ?? 0), 0);
  const paid = (all.data ?? []).filter((p: any) => p.status === 'paid');
  const failed = (all.data ?? []).filter((p: any) => p.status === 'failed').length;
  const refunded = (all.data ?? []).filter((p: any) => p.status === 'refunded').length;
  const aov = paid.length ? sum(paid) / paid.length : 0;

  const stats: [string, string][] = [
    ['Total revenue', formatPrice(sum(paid))],
    ['Total buyers', nf.format(paid.length)],
    ['Today', formatPrice(sum(today.data))],
    ['Yesterday', formatPrice(sum(yesterday.data))],
    ['Last 7 days', formatPrice(sum(week.data))],
    ['Last 30 days', formatPrice(sum(month.data))],
    ['Average order', formatPrice(Math.round(aov))],
    ['Failed / refunded', `${nf.format(failed)} / ${nf.format(refunded)}`],
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-display-sm font-semibold text-ink">Payments</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-xs text-ink-muted">{l}</p>
            <p className="tnum mt-1 text-xl font-medium text-ink">{v}</p>
          </div>
        ))}
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {['', 'paid', 'created', 'failed', 'refunded'].map((s) => (
          <a
            key={s || 'all'}
            href={s ? `/admin/payments?status=${s}` : '/admin/payments'}
            className="rounded-card border border-rule px-3 py-1.5 text-ink-muted hover:bg-surface"
          >
            {s || 'all'}
          </a>
        ))}
      </nav>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-ink-muted">
              <th className="p-3 font-medium">Buyer</th>
              <th className="p-3 font-medium">Contact</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Razorpay</th>
              <th className="p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {(rows.data ?? []).map((p: any) => (
              <tr key={p.id} className="border-b border-rule/60">
                <td className="p-3 text-ink">{p.app_users?.name ?? '\u2014'}</td>
                <td className="p-3 text-ink-muted">
                  <div>{p.app_users?.email}</div>
                  <div className="tnum text-xs">{p.app_users?.phone}</div>
                </td>
                <td className="tnum p-3 text-ink">{formatPrice(p.amount_paise)}</td>
                <td className="p-3 text-ink-muted">{p.status}</td>
                <td className="tnum p-3 text-xs text-ink-faint">
                  <div>{p.razorpay_order_id}</div>
                  <div>{p.razorpay_payment_id ?? '\u2014'}</div>
                </td>
                <td className="p-3 text-ink-muted">
                  {new Date(p.created_at).toLocaleDateString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!(rows.data ?? []).length && (
          <p className="p-6 text-sm text-ink-muted">No payments match this filter yet.</p>
        )}
      </div>
    </div>
  );
}
