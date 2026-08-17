'use client';

import { useState } from 'react';
import { apiSend, useApi, Loading } from './shared';
import { dateTime } from '@/lib/format';

/**
 * Granting access by hand.
 *
 * Keyed on email and phone rather than an internal id, because that pair is
 * what a student will quote when they write to you, and it is exactly what
 * they will type on the restore page afterwards. If no account exists for the
 * pair, one is created — so this doubles as "give a free pass to someone who
 * has never used the site".
 */
export default function AdminGrant() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [days, setDays] = useState('365');
  const [note, setNote] = useState('');
  const [source, setSource] = useState<'admin' | 'promo'>('admin');

  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ expiresAt: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const audit = useApi<{ id: number; action: string; target: string | null; created_at: string; detail: Record<string, unknown> | null }[]>(
    '/api/admin/audit',
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    setDone(null);

    try {
      const res = await apiSend<{ expiresAt: string | null }>('/api/admin/access', 'POST', {
        email, phone, name: name || undefined,
        days: days === 'forever' ? 0 : Number(days),
        note: note || undefined,
        source,
      });
      setDone({ expiresAt: res.expiresAt });
      setName(''); setEmail(''); setPhone(''); setNote('');
      audit.reload();
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string> };
      if (err.fields) setFields(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-grid-2">
      <div className="card admin-card">
        <h2 style={{ fontSize: 16 }}>Give someone access</h2>
        <p className="admin-hint">
          They will use exactly these details on the restore page, so copy them from the student&rsquo;s message
          rather than retyping from memory.
        </p>

        <form onSubmit={submit} noValidate style={{ marginTop: 18, display: 'grid', gap: 16 }}>
          <div className="field">
            <label className="label" htmlFor="g-name">Name <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
            <input id="g-name" className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
          </div>

          <div className="field">
            <label className="label" htmlFor="g-email">Email address</label>
            <input
              id="g-email" className="input" type="email" inputMode="email"
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
              value={email} onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fields.email)} disabled={busy}
            />
            {fields.email && <p className="error" role="alert"><span aria-hidden>!</span>{fields.email}</p>}
          </div>

          <div className="field">
            <label className="label" htmlFor="g-phone">Mobile number</label>
            <input
              id="g-phone" className="input" type="tel" inputMode="numeric" maxLength={17}
              placeholder="98765 43210"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(fields.phone)} disabled={busy}
            />
            {fields.phone && <p className="error" role="alert"><span aria-hidden>!</span>{fields.phone}</p>}
          </div>

          <div className="admin-field-row">
            <div className="field">
              <label className="label" htmlFor="g-days">Valid for</label>
              <select id="g-days" className="input" value={days} onChange={(e) => setDays(e.target.value)} disabled={busy}>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="forever">Never expires</option>
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="g-source">Reason</label>
              <select id="g-source" className="input" value={source}
                      onChange={(e) => setSource(e.target.value as 'admin' | 'promo')} disabled={busy}>
                <option value="admin">Support fix</option>
                <option value="promo">Free pass or promotion</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="g-note">Note <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
            <input
              id="g-note" className="input" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Paid by UPI, gateway timed out" disabled={busy}
            />
            <p className="hint">Kept on the record so you can remember why, months later.</p>
          </div>

          {error && <p className="error" role="alert"><span aria-hidden>!</span>{error}</p>}

          {done && (
            <div className="panel" style={{ background: 'var(--safe-tint)', borderColor: 'var(--safe)' }} role="status">
              <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--safe)' }}>Access granted</p>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>
                {done.expiresAt
                  ? `It runs until ${dateTime(done.expiresAt)}.`
                  : 'It has no expiry date.'}{' '}
                Tell them to open the Restore access page and enter the same email and mobile number.
              </p>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !phone}>
            {busy ? 'Granting\u2026' : 'Grant access'}
          </button>
        </form>
      </div>

      <div className="card admin-card">
        <h2 style={{ fontSize: 16 }}>Recent admin actions</h2>
        <p className="admin-hint">Every grant, revoke and block, kept permanently.</p>

        <div style={{ marginTop: 16 }}>
          {audit.loading && <Loading rows={4} height={40} />}
          {audit.error && <p className="admin-muted">{audit.error}</p>}
          {audit.data && audit.data.length === 0 && <p className="admin-muted">Nothing yet.</p>}
          {audit.data && audit.data.length > 0 && (
            <ul className="admin-list">
              {audit.data.map((a) => (
                <li key={a.id}>
                  <div>
                    <span className="admin-strong">{a.action.replace(/_/g, ' ')}</span>
                    {a.target && <span className="admin-sub num">{a.target.slice(0, 8)}</span>}
                    {typeof a.detail?.note === 'string' && <span className="admin-sub">{a.detail.note}</span>}
                  </div>
                  <span className="admin-sub" style={{ textAlign: 'right' }}>{dateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
