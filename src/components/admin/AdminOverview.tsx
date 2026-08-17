'use client';

import { useState } from 'react';
import { useApi, Loading, ErrorBox, Stat, BarList } from './shared';
import { num, inr, pct } from '@/lib/format';

interface Breakdown { label: string; visitors: number; pageviews: number }
interface Stats {
  days: number;
  overview: {
    days: number; visitors: number; pageviews: number; landings: number;
    searches: number; paywall_views: number; contacts: number;
    orders: number; paid: number; failed: number; revenue_paise: number;
    total_users: number; total_paid: number; total_revenue_paise: number; active_access: number;
  };
  series: { day: string; visitors: number; pageviews: number; searches: number; paid: number; revenue_paise: number }[];
  breakdowns: {
    sources: Breakdown[]; mediums: Breakdown[]; referrers: Breakdown[];
    paths: Breakdown[]; devices: Breakdown[]; countries: Breakdown[];
  };
}

const RANGES: [number, string][] = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '1 year']];

export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useApi<Stats>(`/api/admin/stats?days=${days}`);

  return (
    <section>
      <div className="admin-toolbar">
        <div className="chips" role="group" aria-label="Date range">
          {RANGES.map(([d, label]) => (
            <button key={d} className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>{label}</button>
          ))}
        </div>
      </div>

      {loading && <Loading rows={2} height={120} />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          {/* ---- the funnel, in the order it actually happens ---- */}
          <h2 className="admin-h2">Funnel</h2>
          <div className="admin-stats">
            <Stat label="Visitors" value={num(data.overview.visitors)} sub={`${num(data.overview.pageviews)} page views`} />
            <Stat label="Searches run" value={num(data.overview.searches)}
                  sub={`${pct(data.overview.searches, data.overview.visitors)} of visitors`} />
            <Stat label="Reached paywall" value={num(data.overview.paywall_views)}
                  sub={`${pct(data.overview.paywall_views, data.overview.searches)} of searches`} />
            <Stat label="Gave contact details" value={num(data.overview.contacts)}
                  sub={`${pct(data.overview.contacts, data.overview.paywall_views)} of paywall views`} />
            <Stat label="Paid" value={num(data.overview.paid)} tone="good"
                  sub={`${pct(data.overview.paid, data.overview.visitors, 2)} of visitors`} />
            <Stat label="Revenue" value={inr(data.overview.revenue_paise)} tone="good"
                  sub={`${num(data.overview.failed)} failed payment${data.overview.failed === 1 ? '' : 's'}`} />
          </div>

          <h2 className="admin-h2">All time</h2>
          <div className="admin-stats">
            <Stat label="Registered students" value={num(data.overview.total_users)} />
            <Stat label="Payments received" value={num(data.overview.total_paid)} />
            <Stat label="Total revenue" value={inr(data.overview.total_revenue_paise)} tone="good" />
            <Stat label="With active access" value={num(data.overview.active_access)} />
          </div>

          <h2 className="admin-h2">Day by day</h2>
          <DailyChart series={data.series} />

          <h2 className="admin-h2">Where visitors came from</h2>
          <div className="admin-grid-2">
            <Card title="Source" hint="First touch: the source that first brought each visitor in.">
              <BarList rows={data.breakdowns.sources} />
            </Card>
            <Card title="Medium" hint="organic, social, referral, cpc, or none for direct arrivals.">
              <BarList rows={data.breakdowns.mediums} />
            </Card>
            <Card title="Referring sites" hint="Only real external referrers; your own pages are excluded.">
              <BarList rows={data.breakdowns.referrers} emptyLabel="No external referrers yet" />
            </Card>
            <Card title="Landing pages" hint="Every page view, most-visited first.">
              <BarList rows={data.breakdowns.paths} unit="visitors per page" />
            </Card>
            <Card title="Device" hint="If this is mostly mobile, test every change on a phone first.">
              <BarList rows={data.breakdowns.devices} />
            </Card>
            <Card title="Country" hint="From the edge network, at country level only.">
              <BarList rows={data.breakdowns.countries} emptyLabel="Country data appears once deployed to Vercel" />
            </Card>
          </div>
        </>
      )}
    </section>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card admin-card">
      <h3 style={{ fontSize: 15 }}>{title}</h3>
      {hint && <p className="admin-hint">{hint}</p>}
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

/**
 * Visitors as bars, payments as dots on top of them.
 *
 * Plotted with divs rather than a charting library: it is one series and one
 * overlay, and shipping a chart bundle to look at 30 numbers would be silly.
 */
function DailyChart({ series }: { series: Stats['series'] }) {
  if (!series?.length) return <p className="admin-muted">No traffic recorded yet.</p>;

  const maxVisitors = Math.max(...series.map((d) => d.visitors), 1);
  const maxPaid = Math.max(...series.map((d) => d.paid), 1);
  const totalRevenue = series.reduce((s, d) => s + Number(d.revenue_paise ?? 0), 0);

  return (
    <div className="card admin-card">
      <div className="admin-chart-legend">
        <span><i className="admin-swatch admin-swatch-visitors" />Visitors</span>
        <span><i className="admin-swatch admin-swatch-paid" />Payments</span>
        <span className="admin-muted">{inr(totalRevenue)} over this period</span>
      </div>

      <div className="admin-chart" role="img"
           aria-label={`Daily visitors and payments for the last ${series.length} days`}>
        {series.map((d) => (
          <div key={d.day} className="admin-chart-col"
               title={`${d.day}\n${d.visitors} visitors\n${d.searches} searches\n${d.paid} payments\n${inr(Number(d.revenue_paise ?? 0))}`}>
            <div className="admin-chart-bar" style={{ height: `${(d.visitors / maxVisitors) * 100}%` }} />
            {d.paid > 0 && (
              <div className="admin-chart-dot" style={{ bottom: `${(d.paid / maxPaid) * 78 + 4}%` }} />
            )}
          </div>
        ))}
      </div>

      <div className="admin-chart-axis">
        <span>{series[0]?.day}</span>
        <span>{series[series.length - 1]?.day}</span>
      </div>
    </div>
  );
}
