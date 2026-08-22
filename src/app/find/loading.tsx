/** Mirrors the shape of the search form so the swap is invisible. */
export default function Loading() {
  return (
    <div className="wrap" style={{ paddingBlock: '28px 40px', maxWidth: 640 }} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the search form&hellip;</span>
      <div className="skeleton" style={{ height: 34, width: '58%' }} />
      <div className="skeleton" style={{ height: 16, width: '86%', marginTop: 14 }} />
      <div style={{ marginTop: 30, display: 'grid', gap: 20 }}>
        {[64, 64, 92, 92, 64, 80].map((h, i) => <div key={i} className="skeleton" style={{ height: h }} />)}
      </div>
    </div>
  );
}
