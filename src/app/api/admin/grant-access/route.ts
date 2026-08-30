import { NextResponse } from 'next/server';
import { z } from 'zod';
import { emailSchema, phoneSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { grantAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  name: z.string().trim().max(80).optional(),
  reason: z.string().trim().max(200).optional(),
});

/** Manually give someone access, creating the user record if needed. */
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the details.' },
      { status: 422 },
    );
  }
  const { email, phone, name, reason } = parsed.data;
  const db = supabaseAdmin();

  const { data: user, error } = await db
    .from('app_users')
    .upsert({ email, phone, name: name ?? null }, { onConflict: 'email,phone' })
    .select('id')
    .single();
  if (error || !user) {
    return NextResponse.json({ error: 'Could not create the user.' }, { status: 500 });
  }

  await grantAccess({
    userId: user.id as string,
    source: 'admin',
    grantedByAdmin: admin.id,
    reason: reason ?? 'Granted from admin panel',
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
