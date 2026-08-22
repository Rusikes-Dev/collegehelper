/**
 * Default route-level loading state.
 *
 * Deliberately a skeleton rather than a spinner: it reserves the space the
 * real content will occupy, so the page does not jump when it arrives. On a
 * phone on mobile data during counselling week, that shift is the difference
 * between tapping a button and tapping whatever slid into its place.
 */
export default function Loading() {
  return (
    <div className="wrap" style={{ paddingBlock: '32px 60px', maxWidth: 720 }} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading&hellip;</span>
      <div className="skeleton" style={{ height: 38, width: '68%' }} />
      <div className="skeleton" style={{ height: 18, width: '92%', marginTop: 18 }} />
      <div className="skeleton" style={{ height: 18, width: '80%', marginTop: 10 }} />
      <div style={{ marginTop: 34, display: 'grid', gap: 14 }}>
        {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
      </div>
    </div>
  );
}
