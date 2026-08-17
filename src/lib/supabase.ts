import 'server-only';
import { after } from 'next/server';

/**
 * Minimal Supabase (PostgREST) client.
 *
 * The official SDK would add a dependency and a bundle for four verbs we
 * actually use, so this speaks to the REST endpoint directly. It runs only on
 * the server with the service-role key, which bypasses row-level security —
 * that key must never be exposed to the browser or prefixed NEXT_PUBLIC_.
 *
 * Every call is best-effort by design at the call site: analytics writes must
 * never break a page, while access checks must fail closed. See db.ts.
 */

const URL_ENV = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ENV = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseConfigured(): boolean {
  return Boolean(URL_ENV && KEY_ENV);
}

function config() {
  if (!URL_ENV || !KEY_ENV) {
    throw Object.assign(
      new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'),
      { status: 503, code: 'DB_UNCONFIGURED' },
    );
  }
  return { base: URL_ENV.replace(/\/$/, ''), key: KEY_ENV };
}

type Prefer = 'return=representation' | 'return=minimal' | 'resolution=merge-duplicates,return=representation';

async function request<T>(
  path: string,
  init: RequestInit & { prefer?: Prefer } = {},
): Promise<T> {
  const { base, key } = config();
  const { prefer, headers, ...rest } = init;

  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...rest,
    cache: 'no-store',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[supabase]', res.status, path, detail.slice(0, 400));
    throw Object.assign(new Error('The database rejected that request.'), {
      status: res.status >= 500 ? 502 : 400,
      code: 'DB_ERROR',
    });
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Builds a PostgREST query string. Values are encoded, never interpolated raw. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function select<T>(table: string, params: Record<string, string | number | undefined | null> = {}): Promise<T[]> {
  return request<T[]>(`${table}${qs(params)}`);
}

export async function selectOne<T>(
  table: string,
  params: Record<string, string | number | undefined | null> = {},
): Promise<T | null> {
  const rows = await select<T>(table, { ...params, limit: 1 });
  return rows[0] ?? null;
}

export function insert<T>(table: string, body: unknown, prefer: Prefer = 'return=representation'): Promise<T[]> {
  return request<T[]>(table, { method: 'POST', body: JSON.stringify(body), prefer });
}

/** Insert-or-update on a unique constraint. `onConflict` names the columns. */
export function upsert<T>(table: string, body: unknown, onConflict: string): Promise<T[]> {
  return request<T[]>(`${table}${qs({ on_conflict: onConflict })}`, {
    method: 'POST',
    body: JSON.stringify(body),
    prefer: 'resolution=merge-duplicates,return=representation',
  });
}

export function update<T>(
  table: string,
  match: Record<string, string | number>,
  body: unknown,
): Promise<T[]> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(match)) params[k] = `eq.${v}`;
  return request<T[]>(`${table}${qs(params)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    prefer: 'return=representation',
  });
}

/** Calls a SQL function declared in supabase/schema.sql. */
export function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  return request<T>(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
}

/**
 * For writes where losing the row is better than failing the request:
 * page views, funnel events, last-seen touches.
 *
 * Scheduled with Next's `after()` so the work runs once the response has been
 * sent. On Vercel this matters: a promise left floating after the handler
 * returns is killed when the function freezes, so without this the analytics
 * writes would land only intermittently and the dashboard would quietly
 * under-report. `after()` keeps the invocation alive until the write finishes.
 */
export function fireAndForget(work: () => Promise<unknown>): void {
  const run = async () => {
    try {
      await work();
    } catch (e) {
      console.warn('[supabase] non-critical write failed', (e as Error)?.message);
    }
  };

  try {
    after(run);
  } catch {
    // Outside a request scope (a script, a test) there is nothing to defer to.
    void run();
  }
}
