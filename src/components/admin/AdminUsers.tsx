'use client';

import { useEffect, useState } from 'react';
import Sheet from '../Sheet';
import { useApi, apiSend, Loading, ErrorBox, Empty, Pill } from './shared';
import { inr, num, dateTime, shortDate, daysLeft, ago } from '@/lib/format';
import { formatPhone } from '@/lib/contact';

interface UserRow {
  id: string; email: string; phone: string; name: string | null; blocked: boolean;
  notes: string | null; has_access: boolean; access_until: string | null;
  payment_count: number; spend_paise: number;
  first_source: string | null; first_medium: string | null; first_campaign: string | null;
  first_referrer: string | null; first_landing: string | null;
  created_at: string; last_seen_at: string;
}

interface UsersPayload { page: number; pages: number; total: number; rows: UserRow[] }

const FILTERS: [string, string][] = [
  ['all', 'Everyone'], ['paid', 'Has access'], ['free', 'No access'], ['blocked', 'Blocked'],
];

export default function AdminUsers() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<UserRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(1); }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const url = `/api/admin/users?q=${encodeURIComponent(debounced)}&filter=${filter}&page=${page}`;
  const { data, loading, error, reload } = useApi<UsersPayload>(url);

  return (
    <section>
      <div className="admin-toolbar">
        <input
          className="input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, phone or name"
          aria-label="Search students"
        />
        <div className="chips" role="group" aria-label="Filter">
          {FILTERS.map(([code, label]) => (
            <button key={code} className="chip" aria-pressed={filter === code}
                    onClick={() => { setFilter(code); setPage(1); }}>{label}</button>
          ))}
          <a className="chip" href={`/api/admin/export?filter=${filter}`} download>Export CSV</a>
        </div>
      </div>

      {loading && <Loading rows={5} height={64} />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && data.rows.length === 0 && (
        <Empty
          title={debounced ? `Nobody matches “${debounced}”` : 'No students yet'}
          hint={debounced ? 'Try just the digits of the phone number, or part of the email.' : 'Rows appear here as soon as someone enters their details at the paywall.'}
        />
      )}

      {data && data.rows.length > 0 && (
        <>
          <p className="admin-count">
            {num(data.total)} student{data.total === 1 ? '' : 's'}
            {debounced && <> matching “{debounced}”</>}
          </p>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Access</th>
                  <th className="admin-num">Paid</th>
                  <th>Source</th>
                  <th>Joined</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((u) => (
                  <tr key={u.id} onClick={() => setOpen(u)} tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setOpen(u); }}>
                    <td>
                      <span className="admin-strong">{u.name ?? 'No name given'}</span>
                      <span className="admin-sub num">{u.email}</span>
                      <span className="admin-sub num">{formatPhone(u.phone)}</span>
                    </td>
                    <td>
                      {u.blocked
                        ? <Pill tone="bad">Blocked</Pill>
                        : u.has_access
                          ? <><Pill tone="good">Active</Pill><span className="admin-sub">{daysLeft(u.access_until)}</span></>
                          : <Pill tone="mute">None</Pill>}
                    </td>
                    <td className="admin-num num">
                      {u.payment_count > 0 ? inr(u.spend_paise) : '\u2014'}
                    </td>
                    <td>
                      <span className="admin-sub">{u.first_source ?? 'unknown'}</span>
                      {u.first_campaign && <span className="admin-sub">{u.first_campaign}</span>}
                    </td>
                    <td><span className="admin-sub">{shortDate(u.created_at)}</span></td>
                    <td><span className="admin-chevron" aria-hidden>&rsaquo;</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <nav className="admin-pager" aria-label="Pagination">
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="admin-muted">Page {data.page} of {data.pages}</span>
              <button className="btn btn-secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}

      {open && <UserDetail user={open} onClose={() => setOpen(null)} onChanged={() => { reload(); }} />}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

interface DetailPayload {
  user: UserRow;
  grants: { id: string; source: string; note: string | null; granted_by: string | null; starts_at: string; expires_at: string | null; revoked_at: string | null; created_at: string }[];
  payments: { id: string; order_id: string; payment_id: string | null; amount_paise: number; status: string; method: string | null; created_at: string; paid_at: string | null; error_description: string | null }[];
  access: { active: boolean; until: string | null; source: string | null };
}

const STATUS_TONE: Record<string, 'good' | 'warn' | 'bad' | 'mute'> = {
  captured: 'good', created: 'mute', attempted: 'warn', failed: 'bad',
};

function UserDetail({ user, onClose, onChanged }: { user: UserRow; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useApi<DetailPayload>(`/api/admin/users/${user.id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [days, setDays] = useState('365');

  async function grant() {
    setBusy('grant');
    setMessage(null);
    try {
      const value = days === 'forever' ? 0 : Number(days);
      await apiSend('/api/admin/access', 'POST', { userId: user.id, days: value, source: 'admin', note: 'granted from admin panel' });
      setMessage(value === 0 ? 'Access granted, with no expiry.' : `Access granted for ${value} days.`);
      reload(); onChanged();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    if (!confirm(`Revoke access for ${user.email}? They will lose their results within 30 seconds.`)) return;
    setBusy('revoke');
    setMessage(null);
    try {
      await apiSend('/api/admin/access', 'DELETE', { userId: user.id });
      setMessage('Access revoked.');
      reload(); onChanged();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleBlock(blocked: boolean) {
    setBusy('block');
    try {
      await apiSend(`/api/admin/users/${user.id}`, 'PATCH', { blocked });
      setMessage(blocked ? 'Student blocked.' : 'Block removed.');
      reload(); onChanged();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const active = data?.access.active ?? user.has_access;

  return (
    <Sheet
      title={user.name ?? user.email}
      onClose={onClose}
      footer={
        <>
          {active ? (
            <button className="btn btn-secondary" style={{ flex: 1, color: 'var(--miss)' }}
                    onClick={revoke} disabled={busy !== null}>
              {busy === 'revoke' ? 'Revoking\u2026' : 'Revoke access'}
            </button>
          ) : (
            <select className="input" value={days} onChange={(e) => setDays(e.target.value)}
                    aria-label="Access length" style={{ flex: 1, minWidth: 0 }}>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="forever">Never expires</option>
            </select>
          )}
          {!active && (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={grant} disabled={busy !== null}>
              {busy === 'grant' ? 'Granting\u2026' : 'Grant access'}
            </button>
          )}
        </>
      }
    >
      <dl className="admin-kv">
        <div><dt>Email</dt><dd className="num">{user.email}</dd></div>
        <div><dt>Mobile</dt><dd className="num">{formatPhone(user.phone)}</dd></div>
        <div><dt>Access</dt><dd>{active ? `Active \u2014 ${daysLeft(data?.access.until ?? user.access_until)}` : 'None'}</dd></div>
        <div><dt>Lifetime spend</dt><dd className="num">{inr(user.spend_paise)}</dd></div>
        <div><dt>First source</dt><dd>{user.first_source ?? 'unknown'}{user.first_medium ? ` / ${user.first_medium}` : ''}</dd></div>
        {user.first_campaign && <div><dt>Campaign</dt><dd>{user.first_campaign}</dd></div>}
        {user.first_landing && <div><dt>Landed on</dt><dd className="num">{user.first_landing}</dd></div>}
        <div><dt>Signed up</dt><dd>{dateTime(user.created_at)}</dd></div>
        <div><dt>Last seen</dt><dd>{ago(user.last_seen_at)}</dd></div>
      </dl>

      {message && <p className="admin-message" role="status">{message}</p>}

      {loading && <div style={{ marginTop: 18 }}><Loading rows={2} height={54} /></div>}
      {error && <div style={{ marginTop: 18 }}><ErrorBox message={error} onRetry={reload} /></div>}

      {data && (
        <>
          <h3 className="admin-h3">Payments</h3>
          {data.payments.length === 0 ? (
            <p className="admin-muted">No payment attempts recorded.</p>
          ) : (
            <ul className="admin-list">
              {data.payments.map((p) => (
                <li key={p.id}>
                  <div>
                    <span className="admin-strong num">{inr(p.amount_paise)}</span>
                    <span className="admin-sub num">{p.payment_id ?? p.order_id}</span>
                    {p.error_description && <span className="admin-sub">{p.error_description}</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Pill tone={STATUS_TONE[p.status] ?? 'mute'}>{p.status}</Pill>
                    <span className="admin-sub">{dateTime(p.paid_at ?? p.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="admin-h3">Access history</h3>
          {data.grants.length === 0 ? (
            <p className="admin-muted">No grants yet.</p>
          ) : (
            <ul className="admin-list">
              {data.grants.map((g) => (
                <li key={g.id}>
                  <div>
                    <span className="admin-strong">{g.source}</span>
                    {g.note && <span className="admin-sub">{g.note}</span>}
                    {g.granted_by && <span className="admin-sub">by {g.granted_by}</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {g.revoked_at
                      ? <Pill tone="bad">revoked</Pill>
                      : <Pill tone="good">{g.expires_at ? daysLeft(g.expires_at) : 'no expiry'}</Pill>}
                    <span className="admin-sub">{shortDate(g.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="admin-h3">Danger zone</h3>
          <p className="admin-hint">
            Blocking stops this student from creating new sessions or paying again. It does not revoke access on its
            own &mdash; do both for a chargeback.
          </p>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 12, color: data.user.blocked ? 'var(--safe)' : 'var(--miss)' }}
            onClick={() => toggleBlock(!data.user.blocked)}
            disabled={busy !== null}
          >
            {data.user.blocked ? 'Unblock this student' : 'Block this student'}
          </button>
        </>
      )}
    </Sheet>
  );
}
