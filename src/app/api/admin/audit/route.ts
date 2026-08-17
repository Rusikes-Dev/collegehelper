import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminAuditLog, supabaseConfigured } from '@/lib/db';
import { handleError, apiError } from '@/lib/api';

export const runtime = 'nodejs';

/** The permanent record of who was given or denied access, and when. */
export async function GET() {
  try {
    await requireAdmin();
    if (!supabaseConfigured()) return apiError('Supabase is not configured.', 'DB_UNCONFIGURED', 503);
    return NextResponse.json(await adminAuditLog(60));
  } catch (e) {
    return handleError(e);
  }
}
