import { requireAdminPage } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const nf = new Intl.NumberFormat('en-IN');

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminAnalyticsPage() {
  await requireAdminPage();
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [events, payments] = await Promise.all([
    db.from('analytics_events').select('event, anon_id, created_at').gte('created_at', since),
    db.from('payments').select('amount_paise, created_at').eq('status', 'paid').gte('created_at', since),
  ]);

  const rows = events.data ?? [];
  const inLast = (days: number) =>
    rows.filter((r: any) => new Date(r.created_at) >= new Date(Date.now() - days * 86400_000));

  const views = rows.filter((r: any) => r.event === 'page_view');
  const uniques = new Set(views.map((r: any) => r.anon_id)).size;
  const started = rows.filter((r: any) => r.event === 'predictor_started').length;
  const completed = rows.filter((r: any) => r.event === 'predictor_completed').length;
  const purchases = (payments.data ?? []).length;

  // Visits per day for the last 14 days, as a plain bar list. A chart library
  // is not worth the bundle cost for one sparkline on an admin page.
  const byDay = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    byDay.set(dayKey(new Date(Date.now() - i * 86400_000)), 0);
  }
  views.forEach((r: any) => {
    const k = dayKey(new Date(r.created_at));
    if (byDay.has(k)) byDay.set(k, byDay.get(k)! + 1);
  });
  const peak = Math.max(1, ...byDay.values());

  const cards: [string, string][] = [
    ['Page views (30d)', nf.format(views.length)],
    ['Unique visitors (30d)', nf.format(uniques)],
    ['Views today', nf.format(inLast(1).filter((r: any) => r.event === 'page_view').length)],
    ['Views last 7 days', nf.format(inLast(7).filter((r: any) => r.event === 'page_view').length)],
    ['Predictor started', nf.format(started)],
    ['Predictor completed', nf.format(completed)],
    ['Purchases (30d)', nf.format(purchases)],
    [
      'Completion \u2192 purchase',
      completed ? `${((purchases / completed) * 100).toFixed(1)}%` : '\u2014',
    ],
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-display-sm font-semibold text-ink">Analytics</h2>
      <p className="text-sm text-ink-muted">
        First-party only. No third-party script and no personal data beyond an
        anonymous browser id.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-xs text-ink-muted">{l}</p>
            <p className="tnum mt-1 text-xl font-medium text-ink">{v}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-medium text-ink">Visits by day</h3>
        <ul className="mt-4 space-y-1.5">
          {[...byDay.entries()].map(([day, n]) => (
            <li key={day} className="flex items-center gap-3 text-xs">
              <span className="tnum w-20 shrink-0 text-ink-muted">{day.slice(5)}</span>
              <span className="h-3 rounded-sm bg-brand" style={{ width: `${(n / peak) * 100}%` }} />
              <span className="tnum text-ink-muted">{nf.format(n)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
