'use client';

import { useCallback, useEffect, useState } from 'react';
import { num } from '@/lib/format';

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

export interface Loadable<T> { data: T | null; loading: boolean; error: string | null; reload: () => void }

/**
 * One fetch pattern for every panel: loading, error with a retry, data.
 * A 401 means the admin session lapsed, so the page reloads into the login
 * screen rather than showing a dozen identical error boxes.
 */
export function useApi<T>(url: string): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);

    fetch(url)
      .then(async (res) => {
        if (res.status === 401) { location.reload(); return null; }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? 'That did not load.');
        return json as T;
      })
      .then((json) => { if (live && json) setData(json); })
      .catch((e: Error) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });

    return () => { live = false; };
  }, [url, nonce]);

  return { data, loading, error, reload };
}

export async function apiSend<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error ?? 'That did not work.'), { fields: json.fields });
  return json as T;
}

/* ------------------------------------------------------------------ */
/* Presentation                                                        */
/* ------------------------------------------------------------------ */

export function Loading({ rows = 3, height = 78 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: 'grid', gap: 10 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height }} />)}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="panel" style={{ background: 'var(--miss-tint)', borderColor: 'var(--miss)' }} role="alert">
      <p style={{ fontWeight: 600, fontSize: 14.5 }}>{message}</p>
      {onRetry && <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="panel admin-empty">
      <p style={{ fontWeight: 600 }}>{title}</p>
      {hint && <p style={{ marginTop: 6, fontSize: 14, color: 'var(--muted)' }}>{hint}</p>}
    </div>
  );
}

export function Stat({
  label, value, sub, tone,
}: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className="admin-stat">
      <p className="admin-stat-label">{label}</p>
      <p className={`admin-stat-value num${tone ? ` admin-tone-${tone}` : ''}`}>{value}</p>
      {sub && <p className="admin-stat-sub">{sub}</p>}
    </div>
  );
}

/** Horizontal bar list. Used for every traffic breakdown, so they read alike. */
export function BarList({
  rows, unit = 'visitors', emptyLabel = 'Nothing recorded yet',
}: {
  rows: { label: string; visitors: number; pageviews: number }[];
  unit?: string;
  emptyLabel?: string;
}) {
  if (!rows.length) return <p className="admin-muted">{emptyLabel}</p>;
  const max = Math.max(...rows.map((r) => r.visitors), 1);

  return (
    <ul className="admin-bars">
      {rows.slice(0, 12).map((r) => (
        <li key={r.label}>
          <div className="admin-bar-track" style={{ ['--w' as string]: `${(r.visitors / max) * 100}%` }} />
          <span className="admin-bar-label" title={r.label}>{r.label}</span>
          <span className="admin-bar-value num">{num(r.visitors)}</span>
        </li>
      ))}
      <li className="admin-bar-unit">{unit}</li>
    </ul>
  );
}

export function Pill({ children, tone }: { children: React.ReactNode; tone?: 'good' | 'warn' | 'bad' | 'mute' }) {
  return <span className={`badge${tone ? ` badge-${tone === 'good' ? 'safe' : tone === 'warn' ? 'border' : tone === 'bad' ? 'miss' : ''}` : ''}`}>{children}</span>;
}
