'use client';

/**
 * Last-resort boundary, used when the root layout itself fails.
 *
 * It has to render its own <html> and <body>, and it cannot rely on
 * globals.css having loaded — that stylesheet is imported by the very layout
 * that just failed. Everything here is therefore inline and self-contained.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: '#fff',
          color: '#0F172A',
        }}
      >
        <main style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, margin: 0, letterSpacing: '-0.02em' }}>The site failed to load</h1>
          <p style={{ marginTop: 12, lineHeight: 1.55, color: '#334155' }}>
            Something went wrong at the very top of the application. Reloading usually clears it.
          </p>
          <p style={{ marginTop: 12, lineHeight: 1.55, color: '#334155' }}>
            If you have paid, your access is stored against your email address and mobile number and is not affected.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 22,
              minHeight: 44,
              padding: '12px 24px',
              border: 0,
              borderRadius: 12,
              background: '#1D4ED8',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ marginTop: 18, fontSize: 13, color: '#64748B' }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
