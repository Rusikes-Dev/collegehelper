'use client';

import { useMemo, useState } from 'react';
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
 * The signature element: a cutoff meter on every row.
 *
 * "+2.41" is hard to feel. The bar puts the closing cutoff at the centre line
 * and the candidate on one side of it, so a long list can be read at a glance
 * instead of comparing figures one by one. It encodes the number the row
 * already states and adds nothing to it.
 */
function CutoffMeter({ margin, scale, chance }: { margin: number; scale: number; chance: Chance }) {
  const ratio = Math.max(-1, Math.min(1, margin / (scale || 1)));
  const width = Math.max(Math.abs(ratio) * 50, 1.5);
  const colour = chance === 'GOOD' ? 'bg-good' : chance === 'POSSIBLE' ? 'bg-possible' : 'bg-reach';
  return (
    <div
      className="relative h-1.5 w-full rounded-full bg-wash"
      role="img"
      aria-label={margin >= 0 ? 'Ahead of the closing cutoff' : 'Behind the closing cutoff'}
    >
      <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-line" />
      <div
        className={cn('absolute top-0 h-1.5 rounded-full', colour)}
        style={ratio >= 0 ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
      />
    </div>
  );
}

const nf = new Intl.NumberFormat('en-IN');
const FILTERS: (Chance | 'ALL')[] = ['ALL', 'GOOD', 'POSSIBLE', 'REACH'];

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

  const rounds = useMemo(() => [...new Set(rows.map((r) => r.cap_round))].sort(), [rows]);

  const filtered = rows.filter(
    (r) =>
      (chanceFilter === 'ALL' || r.chance === chanceFilter) &&
      (roundFilter === 'ALL' || r.cap_round === roundFilter),
  );

  // Scale the meters against this result set, so the picture is meaningful
  // whether the spread is two percentile points or fifty thousand ranks.
  const scale = useMemo(() => {
    const magnitudes = rows.map((r) => Math.abs(r.margin)).sort((a, b) => a - b);
    return magnitudes[Math.floor(magnitudes.length * 0.9)] || 1;
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="py-8">
        <EmptyState
          title="Nothing matched those answers"
          body={`No published ${academicYear} cutoff matches this combination. Including all CAP rounds, or all branch groups, usually brings results back.`}
          action={
            <Button variant="secondary" onClick={onRestart}>
              <RotateCcw size={16} aria-hidden /> Change my answers
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 py-6">
      {/* The scorecard: the number they typed, restated as the thing everything
          below is measured against. */}
      <div className="panel overflow-hidden">
        <div className="p-5">
          <p className="text-sm text-ink-muted">
            {rankType === 'PERCENTILE' ? 'MHT-CET percentile' : 'MHT-CET merit rank'}
          </p>
          <p className="tnum mt-1 text-4xl font-semibold leading-none text-ink">
            {rankType === 'PERCENTILE' ? value : nf.format(value)}
          </p>
          <p className="mt-3 text-[0.8125rem] text-ink-muted">
            Compared with {academicYear} CAP cutoffs across{' '}
            <span className="font-semibold text-ink">{nf.format(summary.colleges)}</span> colleges.
          </p>
        </div>
        <dl className="grid grid-cols-3 border-t border-line">
          {[
            { label: 'Good chance', v: summary.good, tone: 'text-good' },
            { label: 'Possible', v: summary.possible, tone: 'text-possible' },
            { label: 'Reach', v: summary.reach, tone: 'text-reach' },
          ].map((s, i) => (
            <div key={s.label} className={cn('p-4', i > 0 && 'border-l border-line')}>
              <dd className={cn('tnum text-2xl font-semibold leading-none', s.tone)}>
                {nf.format(s.v)}
              </dd>
              <dt className="mt-1.5 text-xs text-ink-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setChanceFilter(f)}
              aria-pressed={chanceFilter === f}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors',
                chanceFilter === f
                  ? 'border-brand bg-brand-tint font-semibold text-brand'
                  : 'border-line bg-white text-ink-muted',
              )}
            >
              {f === 'ALL' ? `All ${nf.format(summary.total)}` : CHANCE_META[f].label}
            </button>
          ))}
        </div>
        {rounds.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['ALL', ...rounds].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoundFilter(r)}
                aria-pressed={roundFilter === r}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors',
                  roundFilter === r
                    ? 'border-brand bg-brand-tint font-semibold text-brand'
                    : 'border-line bg-white text-ink-muted',
                )}
              >
                {r === 'ALL' ? 'All rounds' : r}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No options in this filter"
          body="Switch back to All to see the rest of your list."
        />
      ) : (
        <ul className="panel divide-rows overflow-hidden">
          {filtered.map((r, i) => {
            const meta = CHANCE_META[r.chance];
            return (
              <li key={`${r.college_id}-${r.course_code}-${r.cap_round}-${i}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[0.9375rem] font-semibold leading-snug text-ink">
                    {r.branch_name ?? r.program_name}
                  </p>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold',
                      meta.chip,
                    )}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-snug text-ink-muted">{r.college_name}</p>
                <p className="mt-1.5 text-xs text-ink-faint">
                  {[r.city, r.cap_round, r.seat_type_code].filter(Boolean).join(' \u00B7 ')}
                </p>

                <div className="mt-3">
                  <CutoffMeter margin={r.margin} scale={scale} chance={r.chance} />
                </div>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                  <span className="text-ink-muted">
                    Closed at{' '}
                    <span className="tnum font-semibold text-ink">
                      {rankType === 'PERCENTILE'
                        ? r.closing_percentile?.toFixed(4)
                        : nf.format(r.closing_rank ?? 0)}
                    </span>
                  </span>
                  <span className={cn('font-medium', r.margin >= 0 ? 'text-good' : 'text-reach')}>
                    {r.marginLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Disclaimer>{PREDICTION_DISCLAIMER}</Disclaimer>

      <Button variant="secondary" size="lg" className="w-full" onClick={onRestart}>
        <RotateCcw size={16} aria-hidden /> Start again with different answers
      </Button>
    </div>
  );
}
