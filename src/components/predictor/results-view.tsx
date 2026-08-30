'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { Button, Disclaimer, EmptyState, cn } from '@/components/ui';
import {
  CHANCE_META,
  PREDICTION_DISCLAIMER,
  type Chance,
  type PredictionRow,
  type RankType,
} from '@/lib/predictor';

/**
 * The signature element: a margin bar on every row.
 *
 * A number like "+2.41" is hard to feel. The bar puts the closing cutoff at
 * the centre and the candidate's position relative to it on either side, so a
 * whole list can be read at a glance without comparing figures one by one.
 * It encodes the same value the row already states, nothing extra.
 */
function MarginBar({ margin, scale, chance }: { margin: number; scale: number; chance: Chance }) {
  const ratio = Math.max(-1, Math.min(1, margin / (scale || 1)));
  const width = Math.abs(ratio) * 50;
  const colour =
    chance === 'GOOD' ? 'bg-good' : chance === 'POSSIBLE' ? 'bg-possible' : 'bg-reach';
  return (
    <div
      className="relative mt-3 h-1.5 w-full rounded-full bg-surface"
      role="img"
      aria-label={
        margin >= 0 ? 'Ahead of the closing cutoff' : 'Behind the closing cutoff'
      }
    >
      <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-rule" />
      <div
        className={cn('absolute top-0 h-1.5 rounded-full', colour)}
        style={
          ratio >= 0
            ? { left: '50%', width: `${width}%` }
            : { right: '50%', width: `${width}%` }
        }
      />
    </div>
  );
}

const nf = new Intl.NumberFormat('en-IN');

export function ResultsView({
  rows,
  summary,
  academicYear,
  rankType,
  value,
  onRestart,
}: {
  rows: PredictionRow[];
  summary: { total: number; good: number; possible: number; reach: number; colleges: number };
  academicYear: string;
  rankType: RankType;
  value: number;
  onRestart: () => void;
}) {
  const [chanceFilter, setChanceFilter] = useState<Chance | 'ALL'>('ALL');
  const [roundFilter, setRoundFilter] = useState<string>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');

  const rounds = useMemo(
    () => [...new Set(rows.map((r) => r.cap_round))].sort(),
    [rows],
  );
  const cities = useMemo(
    () => [...new Set(rows.map((r) => r.city).filter(Boolean))].sort() as string[],
    [rows],
  );

  const filtered = rows.filter(
    (r) =>
      (chanceFilter === 'ALL' || r.chance === chanceFilter) &&
      (roundFilter === 'ALL' || r.cap_round === roundFilter) &&
      (cityFilter === 'ALL' || r.city === cityFilter),
  );

  // Scale the margin bars against this result set so the visual is meaningful
  // whether the spread is two percentile points or fifty thousand ranks.
  const scale = useMemo(() => {
    const magnitudes = rows.map((r) => Math.abs(r.margin)).sort((a, b) => a - b);
    return magnitudes[Math.floor(magnitudes.length * 0.9)] || 1;
  }, [rows]);

  if (!rows.length) {
    return (
      <EmptyState
        title="No options matched those filters"
        body={
          'Nothing in the ' +
          academicYear +
          ' cutoff data matches this combination. Widening the branches or ' +
          'cities, or including all CAP rounds, usually brings results back.'
        }
        action={
          <Button variant="secondary" onClick={onRestart}>
            <RotateCcw size={16} /> Change my answers
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-display-sm font-semibold text-ink">
          Your CollegeHelper results
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {rankType === 'PERCENTILE' ? 'Percentile' : 'Merit rank'}{' '}
          <span className="tnum font-medium text-ink">{nf.format(value)}</span> &middot;{' '}
          MHT-CET {academicYear} CAP cutoff data
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Matching options', v: summary.total, tone: 'text-ink' },
          { label: 'Good chance', v: summary.good, tone: 'text-good' },
          { label: 'Possible', v: summary.possible, tone: 'text-possible' },
          { label: 'Reach', v: summary.reach, tone: 'text-reach' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <dt className="text-xs text-ink-muted">{s.label}</dt>
            <dd className={cn('tnum mt-1 text-2xl font-medium', s.tone)}>{nf.format(s.v)}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2">
        <Select
          label="Chance"
          value={chanceFilter}
          onChange={(v) => setChanceFilter(v as Chance | 'ALL')}
          options={[
            ['ALL', 'All chances'],
            ['GOOD', 'Good chance'],
            ['POSSIBLE', 'Possible'],
            ['REACH', 'Reach'],
          ]}
        />
        <Select
          label="CAP round"
          value={roundFilter}
          onChange={setRoundFilter}
          options={[['ALL', 'All rounds'], ...rounds.map((r) => [r, r] as [string, string])]}
        />
        {cities.length > 1 && (
          <Select
            label="City"
            value={cityFilter}
            onChange={setCityFilter}
            options={[['ALL', 'All cities'], ...cities.map((c) => [c, c] as [string, string])]}
          />
        )}
      </div>

      <p className="text-sm text-ink-muted">
        Showing <span className="tnum font-medium text-ink">{nf.format(filtered.length)}</span>{' '}
        of {nf.format(rows.length)} options across {nf.format(summary.colleges)} colleges.
      </p>

      <ul className="space-y-3">
        {filtered.slice(0, 200).map((r, i) => {
          const meta = CHANCE_META[r.chance];
          return (
            <li key={`${r.course_code}-${r.cap_round}-${r.seat_type_code}-${i}`} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/colleges/${r.college_slug}`}
                    className="font-medium text-ink hover:text-brand"
                  >
                    {r.college_name}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {r.branch_name ?? r.program_name}
                    {r.city ? ` \u00B7 ${r.city}` : ''}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                    meta.chip,
                  )}
                >
                  {meta.label}
                </span>
              </div>

              <MarginBar margin={r.margin} scale={scale} chance={r.chance} />

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-ink-muted">Closing cutoff</dt>
                  <dd className="tnum text-ink">
                    {rankType === 'PERCENTILE'
                      ? r.closing_percentile?.toFixed(4)
                      : nf.format(r.closing_rank ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Your value</dt>
                  <dd className="tnum text-ink">{nf.format(value)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Difference</dt>
                  <dd className="text-ink">{r.marginLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Round &middot; seat type</dt>
                  <dd className="text-ink">
                    {r.cap_round} &middot;{' '}
                    <span className="tnum" title={r.seat_type_label}>
                      {r.seat_type_code}
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="mt-3 border-t border-rule pt-2 text-xs text-ink-faint">
                Based on the {academicYear} {r.cap_round} cutoff for {r.seat_level}
                {r.stage ? `, stage ${r.stage}` : ''}, this option appears to be a{' '}
                {meta.label.toLowerCase()}.
              </p>
            </li>
          );
        })}
      </ul>

      {filtered.length > 200 && (
        <p className="text-sm text-ink-muted">
          Showing the first 200. Narrow by branch or city to see the rest.
        </p>
      )}

      <Disclaimer>{PREDICTION_DISCLAIMER}</Disclaimer>

      <Button variant="secondary" onClick={onRestart}>
        <RotateCcw size={16} /> Change my answers
      </Button>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 rounded-card border border-rule bg-white px-3 py-2 text-sm">
      <span className="text-ink-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent font-medium text-ink focus:outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
