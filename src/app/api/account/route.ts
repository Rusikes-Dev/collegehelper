import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSession, writeSession } from '@/lib/session';
import { parseContact } from '@/lib/contact';
import { decodeAttribution } from '@/lib/attribution';
import { upsertUser, getAccessState, recordEvent, supabaseConfigured } from '@/lib/db';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { handleError, apiError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Records who is about to pay, before they pay.
 *
 * Two things follow from collecting the email and phone at this point rather
 * than after payment:
 *
 *  - a student who already bought is recognised here and let straight through
 *    without being charged a second time;
 *  - if the payment succeeds but the browser dies before verification, the
 *    webhook still knows whose access to grant.
 */
export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'account'), LIMITS.account);
    if (!gate.ok) return apiError('Too many attempts. Please wait a minute.', 'RATE_LIMITED', 429);

    const session = await readSession();
    if (!session) return apiError('Your session has expired. Please run your search again.', 'NO_SESSION', 401);

    const parsed = parseContact((await req.json().catch(() => ({}))) as Record<string, unknown>);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: 'Please check the highlighted fields.', code: 'VALIDATION', fields: parsed.fields },
        { status: 400 },
      );
    }
    const { name, email, phone } = parsed.value!;

    // Without a database we still keep the details on the session so they can
    // prefill the payment window; there is simply nothing to restore from.
    if (!supabaseConfigured()) {
      await writeSession({ ...session, name, email, phone });
      return NextResponse.json({ ok: true, unlocked: false, storage: 'session' });
    }

    const jar = await cookies();
    const user = await upsertUser({
      email,
      phone,
      name,
      visitorId: jar.get('jcf_vid')?.value ?? null,
      attribution: decodeAttribution(jar.get('jcf_attr')?.value),
    });

    if (user.blocked) {
      return apiError('This account cannot be used. Please contact support.', 'ACCOUNT_BLOCKED', 403);
    }

    const access = await getAccessState(user.id);

    await writeSession({
      ...session,
      name,
      email,
      phone,
      userId: user.id,
      paid: session.paid || access.active,
    });

    recordEvent({
      name: access.active ? 'contact_returning' : 'contact_captured',
      visitorId: jar.get('jcf_vid')?.value,
      userId: user.id,
    });

    return NextResponse.json({
      ok: true,
      unlocked: access.active,
      accessUntil: access.until,
      accessSource: access.source,
      storage: 'database',
    });
  } catch (e) {
    return handleError(e);
  }
}
