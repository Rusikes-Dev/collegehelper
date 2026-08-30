import { NextResponse } from 'next/server';
import { z } from 'zod';
import { emailSchema, phoneSchema } from '@/lib/validation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hasActiveGrant, setAccessCookie, anonId } from '@/lib/access';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { getSettings } from '@/lib/settings';
import { track } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: emailSchema, phone: phoneSchema });

/**
 * Restore access with email + phone, as specified.
 *
 * Two guards, because those fields are guessable:
 *   1. Rate limiting per IP and per email, so the pair cannot be brute-forced.
 *   2. A single response for every failure case. Whether the email is unknown,
 *      the phone does not match, or the account has no purchase, the caller
 *      sees the same message. Distinct errors would turn this endpoint into a
 *      way to test whether a given person has bought the product.
 */
const GENERIC_FAILURE =
  'We could not find a purchase for those details. Check the email and phone ' +
  'number you used at payment, or contact us and we will sort it out.';

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check your details.' },
      { status: 422 },
    );
  }
  const { email, phone } = parsed.data;
  const settings = await getSettings();
  const { max_attempts, window_minutes } = settings.restoreRateLimit;

  const byIp = await checkRateLimit(`restore:ip:${clientIp()}`, max_attempts, window_minutes);
  const byEmail = await checkRateLimit(`restore:email:${email}`, max_attempts, window_minutes);
  if (!byIp.ok || !byEmail.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  }

  const { data: user } = await supabaseAdmin()
    .from('app_users')
    .select('id')
    .eq('email', email)
    .eq('phone', phone)
    .maybeSingle();

  if (!user || !(await hasActiveGrant(user.id as string))) {
    return NextResponse.json({ error: GENERIC_FAILURE }, { status: 404 });
  }

  setAccessCookie(user.id as string);
  await track('access_restored', { anonId: anonId(), userId: user.id as string });
  return NextResponse.json({ ok: true });
}
