import 'server-only';

/**
 * Fixed-window rate limiter.
 *
 * In-memory by default, which is correct for a single instance and degrades
 * safely on serverless (each instance limits independently). Set REDIS_URL and
 * swap the store for a shared one before running many instances.
 */

interface Window { count: number; resetAt: number }
const store = new Map<string, Window>();

export interface Limit { limit: number; windowMs: number }

export const LIMITS = {
  createOrder: { limit: 10, windowMs: 60_000 },
  verify: { limit: 20, windowMs: 60_000 },
  results: { limit: 120, windowMs: 60_000 },
  pdf: { limit: 15, windowMs: 60_000 },
  options: { limit: 60, windowMs: 60_000 },
} satisfies Record<string, Limit>;

export function rateLimit(key: string, { limit, windowMs }: Limit): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || hit.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 10_000) for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
    return { ok: true, retryAfter: 0 };
  }

  hit.count++;
  if (hit.count > limit) return { ok: false, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client identifier behind a proxy. */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = fwd || req.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}
