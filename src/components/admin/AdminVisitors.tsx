'use client';

import { useState } from 'react';
import { useApi, Loading, ErrorBox, Empty, Pill } from './shared';
import { ago } from '@/lib/format';

interface VisitRow {
  id: number; visitor_id: string; path: string; source: string | null; medium: string | null;
  campaign: string | null; referrer_host: string | null; device: string | null; os: string | null;
  browser: string | null; country: string | null; landing: boolean; created_at: string;
}

/**
 * The live visit log.
 *
 * Useful for the question a dashboard cannot answer: "what did the person who
 * came in from that Instagram post actually do?" Visitor ids are shortened for
 * display — they are random, and the full value is of no use to anyone.
 */
export default function AdminVisitors() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi<{ rows: VisitRow[]; hasMore: boolean }>(
    `/api/admin/visits?page=${page}`,
  );

  return (
    <section>
      <div className="admin-toolbar">
        <button className="btn btn-secondary" onClick={reload}>Refresh</button>
        <p className="admin-hint" style={{ margin: 0 }}>
          Newest first. No IP addresses are stored; the visitor id is a random value in a first-party cookie.
        </p>
      </div>

      {loading && <Loading rows={6} height={48} />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.rows.length === 0 && (
        <Empty title="No visits recorded yet" hint="Rows appear here as soon as someone opens the site." />
      )}

      {data && data.rows.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Page</th>
                  <th>Source</th>
                  <th>Device</th>
                  <th>Visitor</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((v) => (
                  <tr key={v.id}>
                    <td><span className="admin-sub">{ago(v.created_at)}</span></td>
                    <td>
                      <span className="admin-strong num">{v.path}</span>
                      {v.landing && <span className="admin-sub">first page of the visit</span>}
                    </td>
                    <td>
                      <span className="admin-strong">{v.source ?? 'unknown'}</span>
                      <span className="admin-sub">
                        {v.medium ?? ''}{v.referrer_host ? ` \u00b7 ${v.referrer_host}` : ''}
                      </span>
                      {v.campaign && <span className="admin-sub">{v.campaign}</span>}
                    </td>
                    <td>
                      <Pill tone={v.device === 'mobile' ? 'good' : 'mute'}>{v.device ?? '?'}</Pill>
                      <span className="admin-sub">{v.os} \u00b7 {v.browser}</span>
                      {v.country && <span className="admin-sub">{v.country}</span>}
                    </td>
                    <td><span className="admin-sub num">{v.visitor_id.slice(0, 8)}</span></td>
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
