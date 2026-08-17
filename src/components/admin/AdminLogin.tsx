'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Sign-in failed.'); return; }
      router.refresh();
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form onSubmit={submit} className="card admin-login-card" noValidate>
        <p className="admin-eyebrow">JEE College Finder</p>
        <h1 style={{ fontSize: 22, marginTop: 6 }}>Admin panel</h1>

        {!configured ? (
          <div className="panel" style={{ marginTop: 18, background: 'var(--border-tint)', borderColor: 'var(--border-line)' }}>
            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              No password is set. Add <code className="num">ADMIN_PASSWORD</code> to your environment variables
              &mdash; at least 10 characters &mdash; and redeploy.
            </p>
          </div>
        ) : (
          <>
            <p style={{ marginTop: 8, fontSize: 14, color: 'var(--muted)' }}>
              Enter the admin password to continue.
            </p>

            <div className="field" style={{ marginTop: 20 }}>
              <label className="label" htmlFor="admin-pw">Password</label>
              <input
                id="admin-pw"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                autoFocus
              />
            </div>

            {error && <p className="error" role="alert" style={{ marginTop: 12 }}><span aria-hidden>!</span>{error}</p>}

            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy || !password}>
              {busy ? 'Checking\u2026' : 'Sign in'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
