import 'server-only';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Admin authentication.
 *
 * One operator, one password held in an environment variable. There is no
 * admin user table on purpose: a table would need its own recovery flow,
 * its own audit story and its own attack surface, for a panel with a single
 * user. Rotating the password is a redeploy, which is the right cost.
 *
 * The signed cookie embeds a fingerprint of the current password, so changing
 * ADMIN_PASSWORD immediately invalidates every session that was open.
 */

const COOKIE = 'jcf_admin';
const TTL_MS = 1000 * 60 * 60 * 12; // a working day

export interface AdminSession { role: 'admin'; label: string; fp: string; exp: number }

export function adminConfigured(): boolean {
  const p = process.env.ADMIN_PASSWORD;
  return Boolean(p && p.length >= 10);
}

export const adminLabel = () => process.env.ADMIN_EMAIL ?? 'admin';

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET is missing or too short.');
  return s;
}

/** Changes when the password changes, so old cookies stop verifying. */
function fingerprint(): string {
  return createHash('sha256').update(process.env.ADMIN_PASSWORD ?? '').digest('hex').slice(0, 16);
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

/** Constant-time password comparison, so response timing leaks nothing. */
export function checkPassword(supplied: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 10) return false;
  const a = createHash('sha256').update(supplied).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function startAdminSession(): Promise<void> {
  const payload: AdminSession = { role: 'admin', label: adminLabel(), fp: fingerprint(), exp: Date.now() + TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // the panel is never linked to from anywhere else
    path: '/',
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function readAdminSession(): Promise<AdminSession | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const [body, mac] = raw.split('.');
  if (!body || !mac) return null;

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as AdminSession;
    if (s.role !== 'admin' || s.exp < Date.now() || s.fp !== fingerprint()) return null;
    return s;
  } catch {
    return null;
  }
}

/** Guard for every /api/admin route. */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await readAdminSession();
  if (!s) throw Object.assign(new Error('Sign in to continue.'), { status: 401, code: 'ADMIN_REQUIRED' });
  return s;
}
