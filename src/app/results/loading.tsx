/**
 * Results are the thing that was paid for, so this skeleton says so.
 *
 * A blank screen after a successful payment is the moment a student decides
 * the money is gone. The reassurance line costs nothing and removes that.
 */
export default function Loading() {
  return (
    <div className="wrap" style={{ paddingBlock: '22px 60px', maxWidth: 900 }} aria-busy="true" aria-live="polite">
      <span className="sr-only">Building your college list&hellip;</span>
      <div className="skeleton" style={{ height: 32, width: '72%' }} />
      <div className="skeleton" style={{ height: 16, width: '48%', marginTop: 12 }} />
      <p style={{ marginTop: 18, fontSize: 14, color: 'var(--muted)' }}>
        Matching your rank against every closing rank&hellip; this takes a moment on a slow connection.
      </p>
      <div className="skeleton" style={{ height: 48, marginTop: 18 }} />
      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 132 }} />)}
      </div>
    </div>
  );
}
