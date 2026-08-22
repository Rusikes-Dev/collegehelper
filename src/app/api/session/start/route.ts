import { NextResponse } from 'next/server';
import { readSession, writeSession, newSession, EMPTY_STUDENT, EMPTY_PREFS } from '@/lib/session';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Opens a session for someone arriving straight at `/pay`.
 *
 * The payment routes all require a session, and normally `/api/search` creates
 * it. But access belongs to the person rather than to one search, so buying
 * before searching is a legitimate order of events — a student sent a direct
 * payment link, or someone told to pay by support after a failed checkout.
 *
 * An existing session is never overwritten. Replacing it would discard a search
 * the student has already run and, worse, could orphan a pending `orderId` and
 * let the same person be charged twice.
 */
export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'session-start'), LIMITS.account);
    if (!gate.ok) return apiError('Too many requests. Please wait a moment.', 'RATE_LIMITED', 429);

    const existing = await readSession();
    if (existing) return NextResponse.json({ ok: true, created: false });

    await writeSession(newSession(EMPTY_STUDENT, EMPTY_PREFS));
    return NextResponse.json({ ok: true, created: true });
  } catch (e) {
    return handleError(e);
  }
}
