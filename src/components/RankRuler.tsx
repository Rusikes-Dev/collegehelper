'use client';

/**
 * The signature element: one line showing where the student's rank falls
 * relative to the opening and closing rank of a seat.
 *
 * A student comparing twenty rows should not have to subtract twenty pairs of
 * six-digit numbers in their head. The bar answers "am I comfortably inside,
 * or scraping in?" before any number is read.
 */
export default function RankRuler({
  openRank, closeRank, yourRank,
}: { openRank: number | null; closeRank: number; yourRank: number }) {
  // Scale runs from rank 1 to a little past whichever is worse: the closing
  // rank or the student's rank, so both always sit on the track.
  const max = Math.max(closeRank, yourRank) * 1.08;
  const pct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));
  const missed = yourRank > closeRank;
  const nf = new Intl.NumberFormat('en-IN');

  return (
    <div>
      <div
        className="ruler"
        role="img"
        aria-label={
          `Opening rank ${openRank ? nf.format(openRank) : 'not available'}, ` +
          `closing rank ${nf.format(closeRank)}, your rank ${nf.format(yourRank)}.`
        }
      >
        <div className="ruler-track" />
        {openRank !== null && (
          <div className="ruler-span" style={{ left: `${pct(openRank)}%`, width: `${Math.max(1, pct(closeRank) - pct(openRank))}%` }} />
        )}
        {openRank !== null && <div className="ruler-mark" style={{ left: `${pct(openRank)}%` }} />}
        <div className="ruler-mark" style={{ left: `${pct(closeRank)}%` }} />
        <div className="ruler-you" data-miss={missed} style={{ left: `calc(${pct(yourRank)}% - 1px)` }} />
      </div>
      <div className="ruler-scale">
        <span>Rank 1</span>
        <span className="num">Closing {nf.format(closeRank)}</span>
      </div>
    </div>
  );
}
