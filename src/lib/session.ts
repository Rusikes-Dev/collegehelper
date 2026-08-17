import 'server-only';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import type { StudentProfile, SearchPreferences } from './types';
import { getAccessState, supabaseConfigured } from './db';

/**
 * Stateless, signed sessions.
 *
 * The search a student paid for is sealed into a signed token at order-creation
 * time. The results API reads the query from that token and never from the
 * request body, so changing rank or category client-side cannot widen what an
 * already-paid session returns — it would invalidate the signature.
 *
 * Since access became user-scoped, the cookie is no longer the final word on
 * whether someone has paid. It carries the user id; the grant lives in the
 * database, so revoking access in the admin panel takes effect on the next
 * request rather than whenever the cookie happens to expire.
 */

const COOKIE = 'jcf_session';
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // a month; the access grant itself lasts longer

export interface SessionPayload {
  sid: string;
  student: StudentProfile;
  preferences: SearchPreferences;
  /** Cookie-level flag. Confirmed against the database when one is configured. */
  paid: boolean;
  /** Supabase app_users.id, set once the student gives their email and phone. */
  userId?: string;
  email?: string;
  phone?: string;
  name?: string | null;
  orderId?: string;
  paymentId?: string;
  paidAt?: number;
  createdAt: number;
  expiresAt: number;
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -hex 32');
  }
  return s;
}

const b64url = (b: Buffer) => b.toString('base64url');

function sign(data: string): string {
  return b64url(createHmac('sha256', secret()).update(data).digest());
}

export function seal(payload: SessionPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

export function unseal(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (!payload.expiresAt || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function newSession(student: StudentProfile, preferences: SearchPreferences): SessionPayload {
  const now = Date.now();
  return { sid: randomUUID(), student, preferences, paid: false, createdAt: now, expiresAt: now + TTL_MS };
}

export async function readSession(): Promise<SessionPayload | null> {
  return unseal((await cookies()).get(COOKIE)?.value);
}

export async function writeSession(payload: SessionPayload): Promise<void> {
  (await cookies()).set(COOKIE, seal(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor((payload.expiresAt - Date.now()) / 1000),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * The one definition of "this person may see results".
 *
 * With a database configured, a live grant on the user always wins: it lets a
 * restored session work even though its cookie was minted unpaid, and lets a
 * revoked user be locked out even though their cookie still says paid.
 */
export async function hasAccess(session: SessionPayload | null): Promise<boolean> {
  if (!session) return false;
  if (supabaseConfigured() && session.userId) {
    try {
      const state = await getAccessState(session.userId);
      if (state.active) return true;
    } catch (e) {
      // A database outage must not lock out someone whose cookie already says paid.
      console.error('[session] access check failed', (e as Error)?.message);
    }
  }
  return session.paid === true;
}

/** Guard for every route that returns paid content. */
export async function requirePaidSession(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) {
    throw Object.assign(new Error('Your session has expired. Please start a new search.'), { status: 401, code: 'NO_SESSION' });
  }
  if (!(await hasAccess(session))) {
    throw Object.assign(new Error('This session has not completed payment.'), { status: 402, code: 'PAYMENT_REQUIRED' });
  }
  return session;
}
