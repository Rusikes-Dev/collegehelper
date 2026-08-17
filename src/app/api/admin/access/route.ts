import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { parseContact } from '@/lib/contact';
import {
  upsertUser, findUserById, grantAccess, revokeAccessForUser, getAccessState,
  audit, supabaseConfigured, ACCESS_DAYS,
} from '@/lib/db';
import { apiError, handleError } from '@/lib/api';

export const runtime = 'nodejs';

/**
 * Granting and revoking access by hand.
 *
 * This is the route that answers "a student paid but something went wrong",
 * "I promised a free pass to a school", and "this was a chargeback". It works
 * by email and phone rather than by internal id, because that is what you will
 * have in front of you when a student writes to you — and it is exactly the
 * pair they will use to restore.
 */

const grantSchema = z.object({
  // Either identify an existing user by id…
  userId: z.string().uuid().optional(),
  // …or by the details they will restore with.
  email: z.string().max(254).optional(),
  phone: z.string().max(20).optional(),
  name: z.string().max(80).optional(),
  /** 0 or null means access that never lapses. */
  days: z.number().int().min(0).max(3650).nullable().optional(),
  note: z.string().max(500).optional(),
  source: z.enum(['admin', 'promo']).default('admin'),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!supabaseConfigured()) return apiError('Supabase is not configured.', 'DB_UNCONFIGURED', 503);

    const parsed = grantSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiError('Check the form and try again.', 'BAD_PAYLOAD', 400);
    const v = parsed.data;

    let userId = v.userId ?? null;

    if (!userId) {
      const contact = parseContact({ email: v.email, phone: v.phone, name: v.name });
      if (!contact.ok) {
        return NextResponse.json(
          { error: 'Check the highlighted fields.', code: 'VALIDATION', fields: contact.fields },
          { status: 400 },
        );
      }
      const user = await upsertUser({ ...contact.value!, attribution: null, visitorId: null });
      userId = user.id;
    } else if (!(await findUserById(userId))) {
      return apiError('No user with that id.', 'NOT_FOUND', 404);
    }

    const grant = await grantAccess({
      userId,
      source: v.source,
      days: v.days === undefined ? ACCESS_DAYS : v.days,
      note: v.note ?? null,
      grantedBy: admin.label,
    });

    audit('access_granted', userId, { by: admin.label, days: v.days ?? ACCESS_DAYS, note: v.note ?? null });

    return NextResponse.json({
      ok: true,
      userId,
      grantId: grant.id,
      expiresAt: grant.expires_at,
    });
  } catch (e) {
    return handleError(e);
  }
}

const revokeSchema = z.object({ userId: z.string().uuid() });

/** Revokes every live grant on a user. Takes effect within 30 seconds. */
export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!supabaseConfigured()) return apiError('Supabase is not configured.', 'DB_UNCONFIGURED', 503);

    const parsed = revokeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiError('Which user?', 'BAD_PAYLOAD', 400);

    const count = await revokeAccessForUser(parsed.data.userId, admin.label);
    audit('access_revoked', parsed.data.userId, { by: admin.label, grants: count });

    const access = await getAccessState(parsed.data.userId);
    return NextResponse.json({ ok: true, revoked: count, stillActive: access.active });
  } catch (e) {
    return handleError(e);
  }
}
