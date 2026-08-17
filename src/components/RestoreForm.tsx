'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Two fields and one button.
 *
 * The failure message never distinguishes "we have no record of you" from
 * "you never paid" from "your access lapsed", because doing so would let
 * anyone test whether a given phone number belongs to a customer. It does say
 * what to check, which is what an honest student actually needs.
 */
export default function RestoreForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string | null; until: string | null; hasSearch: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});

    try {
      const res = await fetch('/api/access/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.fields) setFields(data.fields);
        else setError(data.error ?? 'We could not restore your access.');
        return;
      }

      setDone({ name: data.name ?? null, until: data.accessUntil ?? null, hasSearch: Boolean(data.hasSearch) });
      setTimeout(() => router.push(data.hasSearch ? '/results' : '/find'), 1400);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel" style={{ marginTop: 24, background: 'var(--safe-tint)', borderColor: 'var(--safe)', textAlign: 'center' }}>
        <div aria-hidden className="tick">&#10003;</div>
        <h2 style={{ fontSize: 17, marginTop: 12 }}>
          {done.name ? `Welcome back, ${done.name}` : 'Access restored'}
        </h2>
        <p style={{ marginTop: 8, fontSize: 14.5, color: 'var(--ink-2)' }} role="status">
          {done.hasSearch ? 'Opening your results\u2026' : 'Taking you to the search form\u2026'}
        </p>
        {done.until && (
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
            Your access runs until {new Date(done.until).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ marginTop: 26, display: 'grid', gap: 18 }}>
      <div className="field">
        <label className="label" htmlFor="r-email">Email address</label>
        <input
          id="r-email"
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fields.email)}
          aria-describedby={fields.email ? 'r-email-err' : undefined}
          disabled={busy}
        />
        {fields.email && <p className="error" id="r-email-err" role="alert"><span aria-hidden>!</span>{fields.email}</p>}
      </div>

      <div className="field">
        <label className="label" htmlFor="r-phone">Mobile number</label>
        <input
          id="r-phone"
          className="input"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          enterKeyHint="go"
          placeholder="98765 43210"
          maxLength={17}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={Boolean(fields.phone)}
          aria-describedby={fields.phone ? 'r-phone-err' : undefined}
          disabled={busy}
        />
        {fields.phone && <p className="error" id="r-phone-err" role="alert"><span aria-hidden>!</span>{fields.phone}</p>}
      </div>

      {error && <p className="error" role="alert"><span aria-hidden>!</span>{error}</p>}

      <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !phone}>
        {busy ? 'Checking\u2026' : 'Restore my access'}
      </button>
    </form>
  );
}
