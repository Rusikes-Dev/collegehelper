import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Only these keys can be written from the admin UI. */
const EDITABLE = z.enum([
  'predictor_access_mode',
  'predictor_price_paise',
  'predictor_active_year',
  'predictor_thresholds',
  'access_grant_ttl_days',
  'restore_rate_limit',
  'site_announcement',
]);

const schema = z.object({ key: EDITABLE, value: z.unknown() });

const VALIDATORS: Record<string, z.ZodTypeAny> = {
  predictor_access_mode: z.enum(['FREE', 'PAID']),
  predictor_price_paise: z.number().int().min(100).max(1_000_00),
  predictor_active_year: z.string().regex(/^\d{4}-\d{2}$/),
  access_grant_ttl_days: z.number().int().min(1).max(3650).nullable(),
  site_announcement: z.string().max(280).nullable(),
};

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Unknown setting.' }, { status: 422 });
  }

  const validator = VALIDATORS[parsed.data.key];
  if (validator) {
    const v = validator.safeParse(parsed.data.value);
    if (!v.success) {
      return NextResponse.json(
        { error: v.error.issues[0]?.message ?? 'That value is not allowed.' },
        { status: 422 },
      );
    }
  }

  const { error } = await supabaseAdmin()
    .from('site_settings')
    .update({
      value: parsed.data.value,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    .eq('key', parsed.data.key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
