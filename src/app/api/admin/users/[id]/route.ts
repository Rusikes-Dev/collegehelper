import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import {
  findUserById, listGrants, listPaymentsForUser, getAccessState, setUserFlags, audit,
} from '@/lib/db';
import { apiError, handleError } from '@/lib/api';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One student: their access history, their payments, their attribution. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!UUID.test(id)) return apiError('Not a valid user id.', 'BAD_ID', 400);

    const user = await findUserById(id);
    if (!user) return apiError('No user with that id.', 'NOT_FOUND', 404);

    const [grants, payments, access] = await Promise.all([
      listGrants(id),
      listPaymentsForUser(id),
      getAccessState(id),
    ]);

    return NextResponse.json({ user, grants, payments, access });
  } catch (e) {
    return handleError(e);
  }
}

const patchSchema = z.object({
  blocked: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/** Blocking is for abuse and chargebacks; it does not revoke access on its own. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    if (!UUID.test(id)) return apiError('Not a valid user id.', 'BAD_ID', 400);

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiError('Nothing valid to update.', 'BAD_PAYLOAD', 400);

    await setUserFlags(id, parsed.data);
    audit('user_updated', id, { by: admin.label, ...parsed.data });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
