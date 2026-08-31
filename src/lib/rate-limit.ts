import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

/**
 * Database-backed rate limiting. Serverless functions do not share memory, so
 * an in-process counter would reset on every cold start and protect nothing.
 */
export async function checkRateLimit(
  bucket: string,
  maxAttempts: number,
  windowMinutes: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { count } = await db
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .gte('created_at', since);

  if ((count ?? 0) >= maxAttempts) {
    return { ok: false, retryAfterSeconds: windowMinutes * 60 };
  }
  await db.from('rate_limits').insert({ bucket });
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(): string {
  const h = headers();
  const fwd = h.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
}
