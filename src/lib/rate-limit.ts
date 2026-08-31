import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { headers } from 'next/headers';
import { createHash, createHmac } from 'node:crypto';

/**
 * Database-backed rate limiting. Serverless functions do not share memory, so
 * an in-process counter would reset on every cold start and protect nothing.
 */

/**
 * Buckets are keyed on things that identify a person - a network address, an
 * email address - so they are stored as an irreversible digest rather than in
 * the clear. Keyed with the signing secret where one is configured, because a
 * plain hash of an email address is reversible by anyone willing to try
 * candidates. The digest is stable, so counting still works.
 */
function bucketKey(bucket: string): string {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  const digest = secret
    ? createHmac('sha256', secret).update(bucket).digest('hex')
    : createHash('sha256').update(bucket).digest('hex');
  // The prefix before the first colon is a category, not an identifier, and is
  // kept readable so the table can still be reasoned about in the admin panel.
  const prefix = bucket.split(':')[0];
  return `${prefix}:${digest.slice(0, 32)}`;
}

export async function checkRateLimit(
  bucket: string,
  maxAttempts: number,
  windowMinutes: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const db = supabaseAdmin();
  const key = bucketKey(bucket);
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { count } = await db
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('bucket', key)
    .gte('created_at', since);

  if ((count ?? 0) >= maxAttempts) {
    return { ok: false, retryAfterSeconds: windowMinutes * 60 };
  }
  await db.from('rate_limits').insert({ bucket: key });
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(): string {
  const h = headers();
  const fwd = h.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
}
