import 'server-only';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import type { StudentProfile, SearchPreferences } from './types';

/**
 * Stateless, signed sessions.
 *
 * The search a student paid for is sealed into a signed token at order-creation
 * time. The results API reads the query from that token and never from the
 * request body, so changing rank or category client-side cannot widen what an
 * already-paid session returns — it would invalidate the signature.
 *
 * Payment state lives in the token only after the server has verified the
 * Razorpay signature. There is no client-settable "paid" flag anywhere.
 */

const COOKIE = 'jcf_session';
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // results stay reachable for a week

export interface SessionPayload {
  sid: string;
  student: StudentProfile;
  preferences: SearchPreferences;
  /** Set only by the server, only after Razorpay signature verification. */
  paid: boolean;
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

/** Guard for every route that returns paid content. */
export async function requirePaidSession(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) {
    throw Object.assign(new Error('Your session has expired. Please start a new search.'), { status: 401, code: 'NO_SESSION' });
  }
  if (!session.paid) {
    throw Object.assign(new Error('This session has not completed payment.'), { status: 402, code: 'PAYMENT_REQUIRED' });
  }
  return session;
}
