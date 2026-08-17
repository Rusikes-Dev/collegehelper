'use client';

import { useState } from 'react';
import { useApi, Loading, ErrorBox, Empty, Pill } from './shared';
import { inr, dateTime } from '@/lib/format';
import { formatPhone } from '@/lib/contact';

interface PaymentRow {
  id: string; order_id: string; payment_id: string | null; amount_paise: number;
  status: string; method: string | null; email: string | null; phone: string | null;
  source: string | null; campaign: string | null;
  error_description: string | null; created_at: string; paid_at: string | null;
}

const STATUSES: [string, string][] = [
  ['all', 'All'], ['captured', 'Paid'], ['created', 'Started'], ['failed', 'Failed'],
];

const TONE: Record<string, 'good' | 'warn' | 'bad' | 'mute'> = {
  captured: 'good', created: 'mute', attempted: 'warn', failed: 'bad',
};

export default function AdminPayments() {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi<{ rows: PaymentRow[]; hasMore: boolean }>(
    `/api/admin/payments?status=${status}&page=${page}`,
  );

  return (
    <section>
      <div className="admin-toolbar">
        <div className="chips" role="group" aria-label="Payment status">
          {STATUSES.map(([code, label]) => (
            <button key={code} className="chip" aria-pressed={status === code}
                    onClick={() => { setStatus(code); setPage(1); }}>{label}</button>
          ))}
        </div>
      </div>

      <p className="admin-hint" style={{ marginBottom: 14 }}>
        Orders appear here the moment the payment window opens, so &ldquo;Started&rdquo; rows are checkouts that were
        abandoned. A high count there usually means the price or the payment step needs a look, not a bug.
      </p>

      {loading && <Loading rows={5} height={58} />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.rows.length === 0 && <Empty title="No payments in this view" />}

      {data && data.rows.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="admin-num">Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Source</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="admin-strong num">{p.email ?? 'unknown'}</span>
                      <span className="admin-sub num">{p.phone ? formatPhone(p.phone) : ''}</span>
                      <span className="admin-sub num">{p.payment_id ?? p.order_id}</span>
                    </td>
                    <td className="admin-num num">{inr(p.amount_paise)}</td>
                    <td>
                      <Pill tone={TONE[p.status] ?? 'mute'}>{p.status}</Pill>
                      {p.error_description && <span className="admin-sub">{p.error_description}</span>}
                    </td>
                    <td><span className="admin-sub">{p.method ?? '\u2014'}</span></td>
                    <td>
                      <span className="admin-sub">{p.source ?? 'unknown'}</span>
                      {p.campaign && <span className="admin-sub">{p.campaign}</span>}
                    </td>
                    <td><span className="admin-sub">{dateTime(p.paid_at ?? p.created_at)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="admin-pager" aria-label="Pagination">
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="admin-muted">Page {page}</span>
            <button className="btn btn-secondary" disabled={!data.hasMore} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        </>
      )}
    </section>
  );
}
