export default function Loading() {
  return (
    <div className="wrap" style={{ paddingBlock: '28px 40px', maxWidth: 520 }} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading&hellip;</span>
      <div className="skeleton" style={{ height: 34, width: '64%' }} />
      <div className="skeleton" style={{ height: 16, width: '90%', marginTop: 14 }} />
      <div style={{ marginTop: 28, display: 'grid', gap: 18 }}>
        {[80, 80, 48].map((h, i) => <div key={i} className="skeleton" style={{ height: h }} />)}
      </div>
    </div>
  );
}
