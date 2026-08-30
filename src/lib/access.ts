import 'server-only';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Access is proved by a short-lived signed cookie, backed by a row in
 * access_grants. The cookie is a convenience so the results page loads without
 * a round trip; the grant in the database is the source of truth, and every
 * results request re-checks it. A forged cookie therefore buys nothing.
 */

const COOKIE = 'ch_access';
const TTL_SECONDS = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.ACCESS_TOKEN_SECRET;
  if (!s || s.length < 16) {
    throw new Error('ACCESS_TOKEN_SECRET is missing or too short.');
  }
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueAccessToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function readAccessToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = sign(`${userId}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  return userId;
}

export function setAccessCookie(userId: string) {
  cookies().set(COOKIE, issueAccessToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export function clearAccessCookie() {
  cookies().delete(COOKIE);
}

export function currentUserIdFromCookie(): string | null {
  return readAccessToken(cookies().get(COOKIE)?.value);
}

/** The authoritative check: is there a live, unrevoked grant for this user? */
export async function hasActiveGrant(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from('access_grants')
    .select('id, expires_at')
    .eq('user_id', userId)
    .is('revoked_at', null);
  if (error || !data?.length) return false;
  const now = Date.now();
  return data.some(
    (g: any) => !g.expires_at || new Date(g.expires_at).getTime() > now,
  );
}

export async function grantAccess(opts: {
  userId: string;
  source: 'payment' | 'admin' | 'promo' | 'free_mode';
  paymentId?: string | null;
  grantedByAdmin?: string | null;
  reason?: string | null;
  ttlDays?: number | null;
}) {
  const expires =
    opts.ttlDays && opts.ttlDays > 0
      ? new Date(Date.now() + opts.ttlDays * 86400_000).toISOString()
      : null;
  const { data, error } = await supabaseAdmin()
    .from('access_grants')
    .insert({
      user_id: opts.userId,
      source: opts.source,
      payment_id: opts.paymentId ?? null,
      granted_by_admin: opts.grantedByAdmin ?? null,
      reason: opts.reason ?? null,
      expires_at: expires,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

/** Stable per-browser id used to attribute analytics without a login. */
export function anonId(): string {
  const jar = cookies();
  const existing = jar.get('ch_anon')?.value;
  if (existing) return existing;
  const id = randomUUID();
  jar.set('ch_anon', id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}
