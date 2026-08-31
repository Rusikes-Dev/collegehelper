import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const schema = z.object({
  grantId: z.string().uuid(),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 422 });
  }

  // Revoked, never deleted: the audit trail of who had access and why has to
  // survive the revocation.
  const { error } = await supabaseAdmin()
    .from('access_grants')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by_admin: admin.id,
      reason: parsed.data.reason ?? 'Revoked from admin panel',
    })
    .eq('id', parsed.data.grantId)
    .is('revoked_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
