'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/components/ui';
import { SEAT_TYPE_LABELS, type Cutoff } from '@/data/colleges';

const nf = new Intl.NumberFormat('en-IN');

/**
 * Closing figures for one college, one CAP round at a time.
 *
 * Both the percentile and the rank are printed, side by side and unchanged
 * from the source, because the official document publishes both and a student
 * checking our page against the PDF should find the same two numbers.
 */
export function CutoffTable({ cutoffs, year }: { cutoffs: Cutoff[]; year: string }) {
  const rounds = useMemo(() => [...new Set(cutoffs.map((c) => c.round))], [cutoffs]);
  const [round, setRound] = useState(rounds[0]);

  const byProgram = useMemo(() => {
    const map = new Map<string, Cutoff[]>();
    for (const c of cutoffs) {
      if (c.round !== round) continue;
      if (!map.has(c.program)) map.set(c.program, []);
      map.get(c.program)!.push(c);
    }
    return [...map.entries()];
  }, [cutoffs, round]);

  if (!rounds.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {rounds.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRound(r)}
            aria-pressed={round === r}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors',
              round === r
                ? 'border-brand bg-brand-tint font-semibold text-brand'
                : 'border-line bg-white text-ink-muted',
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="panel divide-rows overflow-hidden">
        {byProgram.map(([program, rows]) => (
          <div key={program} className="p-4">
            <p className="text-[0.9375rem] font-semibold leading-snug text-ink">{program}</p>
            <table className="mt-2.5 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint">
                  <th className="pb-1.5 font-medium">Seat type</th>
                  <th className="pb-1.5 text-right font-medium">Percentile</th>
                  <th className="pb-1.5 text-right font-medium">Rank</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.seatType} className="border-t border-line">
                    <td className="py-2 pr-2 text-ink-muted">
                      <span className="tnum text-xs font-semibold text-ink">{r.seatType}</span>
                      <span className="block text-xs leading-tight">
                        {SEAT_TYPE_LABELS[r.seatType] ?? 'Seat type as printed in the CAP list'}
                      </span>
                    </td>
                    <td className="tnum py-2 text-right font-semibold text-ink">
                      {r.closingPercentile?.toFixed(4) ?? '—'}
                    </td>
                    <td className="tnum py-2 text-right text-ink-muted">
                      {r.closingRank != null ? nf.format(r.closingRank) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-ink-faint">
        Closing figures for {year}, {round}, taken from the official MHT-CET CAP cutoff
        list. Seats can close at a different figure in a later round.
      </p>
    </div>
  );
}
