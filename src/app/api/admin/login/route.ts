import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkPassword, startAdminSession, endAdminSession, adminConfigured } from '@/lib/admin';
import { audit } from '@/lib/db';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { apiError, handleError } from '@/lib/api';

export const runtime = 'nodejs';

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  try {
    const gate = rateLimit(clientKey(req, 'admin-login'), LIMITS.adminLogin);
    if (!gate.ok) {
      return apiError(
        `Too many attempts. Try again in ${Math.ceil(gate.retryAfter / 60)} minute(s).`,
        'RATE_LIMITED',
        429,
      );
    }

    if (!adminConfigured()) {
      return apiError(
        'The admin panel is not set up. Set ADMIN_PASSWORD (at least 10 characters) in your environment variables and redeploy.',
        'ADMIN_UNCONFIGURED',
        503,
      );
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiError('Enter your password.', 'BAD_PAYLOAD', 400);

    if (!checkPassword(parsed.data.password)) {
      audit('admin_login_failed', null, { ip: clientKey(req, '').slice(1) });
      return apiError('That password is not correct.', 'BAD_CREDENTIALS', 401);
    }

    await startAdminSession();
    audit('admin_login', null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  await endAdminSession();
  return NextResponse.json({ ok: true });
}
