'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { PercentileBar, cn, inputClass } from '@/components/ui';
import type { RoundCutoffs } from '@/data/colleges';

const nf = new Intl.NumberFormat('en-IN');

/**
 * Closing figures for one college, one CAP round at a time.
 *
 * Both the percentile and the rank are printed, side by side and unchanged
 * from the source, because the official document publishes both and a student
 * checking this page against the PDF should find the same two numbers. The bar
 * is the only thing added, and it is drawn from the percentile rather than
 * from a conversion, so it cannot disagree with the figure beside it.
 *
 * The rounds arrive already grouped and sorted from the server, and the
 * seat-type legend arrives as a prop: the full legend lives in a generated
 * file this client component must not pull into the bundle.
 */
export function CutoffTable({
  rounds,
  year,
  seatLabels,
}: {
  rounds: RoundCutoffs[];
  year: string | null;
  seatLabels: Record<string, string>;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const current = rounds[roundIndex];

  const programs = useMemo(() => {
    if (!current) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return current.programs;
    return current.programs.filter((p) => p.name.toLowerCase().includes(needle));
  }, [current, query]);

  if (!rounds.length || !current) return null;

  const LIMIT = 4;
  const visible = expanded ? programs : programs.slice(0, LIMIT);
  const hidden = programs.length - visible.length;
  const showFilter = current.programs.length > 5;

  return (
    <div className="space-y-4">
      {/* CAP rounds are a real sequence, so they are numbered as one. */}
      <div className="rail rail-bleed pb-1">
        {rounds.map((r, i) => {
          const on = i === roundIndex;
          return (
            <button
              key={r.round}
              type="button"
              onClick={() => {
                setRoundIndex(i);
                setExpanded(false);
              }}
              aria-pressed={on}
              className={cn(
                'flex min-h-[2.75rem] shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                on
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-white text-ink-muted hover:border-brand-edge hover:bg-brand-tint',
              )}
            >
              <span
                className={cn(
                  'tnum flex h-5 w-5 items-center justify-center rounded-full text-[0.6875rem] font-semibold',
                  on ? 'bg-white/20 text-white' : 'bg-wash text-ink-faint',
                )}
              >
                {i + 1}
              </span>
              <span className={on ? 'font-semibold' : ''}>
                {r.round.replace('CAP Round ', 'Round ')}
              </span>
            </button>
          );
        })}
      </div>

      {showFilter && (
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExpanded(false);
            }}
            type="search"
            className={`${inputClass} pl-11`}
            placeholder="Filter by branch"
            aria-label="Filter cutoffs by branch"
          />
        </div>
      )}

      {programs.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
          No branch matches that. Clear the filter to see all {current.programs.length}.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <section key={p.code} className="panel overflow-hidden">
              <header className="border-b border-line bg-wash px-4 py-3">
                <h3 className="text-[0.9375rem] font-semibold leading-snug text-ink">{p.name}</h3>
                <p className="tnum mt-0.5 text-xs text-ink-faint">{p.code}</p>
              </header>

              <ul className="divide-rows">
                {p.rows.map((r) => (
                  <li key={r.seat} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <span className="tnum text-[0.8125rem] font-semibold text-ink">
                          {r.seat}
                        </span>
                        <span className="mt-0.5 block text-xs leading-tight text-ink-muted">
                          {seatLabels[r.seat] ?? 'Seat type as printed in the CAP list'}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="tnum text-[0.9375rem] font-semibold text-ink">
                          {r.pct != null ? r.pct.toFixed(4) : '—'}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-faint">
                          {r.rank != null ? `rank ${nf.format(r.rank)}` : 'no rank'}
                        </span>
                      </div>
                    </div>
                    {r.pct != null && <PercentileBar value={r.pct} className="mt-2.5" />}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex min-h-[2.75rem] w-full items-center justify-center gap-1.5 rounded-card border border-line bg-white text-sm font-semibold text-brand hover:bg-brand-tint"
            >
              Show {hidden} more {hidden === 1 ? 'branch' : 'branches'}
              <ChevronDown size={16} aria-hidden />
            </button>
          )}
        </div>
      )}

      <p className="text-xs leading-relaxed text-ink-faint">
        Closing figures for {year ?? 'the latest year'}, {current.round}, taken from the
        official MHT-CET CAP cutoff list. The bar shows the closing percentile on a 0&ndash;100
        scale. A seat can close at a different figure in a later round.
      </p>
    </div>
  );
}
