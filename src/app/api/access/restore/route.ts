import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSession, writeSession, newSession } from '@/lib/session';
import { parseContact } from '@/lib/contact';
import { findUser, getAccessState, recordEvent, supabaseConfigured } from '@/lib/db';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';
import type { StudentProfile, SearchPreferences } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Gets a paying student back in on a new phone, a new browser or after
 * clearing their cookies.
 *
 * The (email, phone) pair is the credential, so the response is deliberately
 * uniform: "no live access for those details" is returned whether the user
 * does not exist, has never paid, or has lapsed. Anything more specific would
 * turn this endpoint into a way of checking whether a given phone number
 * belongs to a customer. The rate limit is the tightest in the app for the
 * same reason.
 */

const EMPTY_STUDENT: StudentProfile = {
  ranks: { mainCrl: 1 },
  category: 'OPEN',
  isPwd: false,
  gender: 'MALE',
  homeState: null,
};
const EMPTY_PREFS: SearchPreferences = { instituteTypes: 'ALL', programIds: 'ALL' };

export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'restore'), LIMITS.restore);
    if (!gate.ok) {
      return apiError(
        `Too many attempts. Try again in ${Math.ceil(gate.retryAfter / 60)} minute(s).`,
        'RATE_LIMITED',
        429,
      );
    }

    if (!supabaseConfigured()) {
      return apiError('Restoring access is not available on this deployment.', 'DB_UNCONFIGURED', 503);
    }

    const parsed = parseContact((await req.json().catch(() => ({}))) as Record<string, unknown>);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: 'Please check the highlighted fields.', code: 'VALIDATION', fields: parsed.fields },
        { status: 400 },
      );
    }
    const { email, phone } = parsed.value!;

    const notFound = () =>
      apiError(
        'We could not find active access for those details. Check the email address and mobile number you used when paying — they have to match exactly.',
        'NO_ACCESS',
        404,
      );

    const user = await findUser(email, phone);
    if (!user || user.blocked) return notFound();

    const access = await getAccessState(user.id);
    if (!access.active) return notFound();

    // Keep whatever search the current session already holds, so restoring
    // mid-flow does not throw away what the student just typed.
    const current = await readSession();
    const base = current ?? newSession(EMPTY_STUDENT, EMPTY_PREFS);

    await writeSession({
      ...base,
      userId: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      paid: true,
    });

    recordEvent({
      name: 'access_restored',
      visitorId: (await cookies()).get('jcf_vid')?.value,
      userId: user.id,
    });

    return NextResponse.json({
      ok: true,
      name: user.name,
      accessUntil: access.until,
      /** Whether the session already holds a search worth showing results for. */
      hasSearch: Boolean(current && current.student.ranks.mainCrl > 1),
    });
  } catch (e) {
    return handleError(e);
  }
}
