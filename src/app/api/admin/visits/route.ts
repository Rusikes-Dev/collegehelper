import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminRecentVisits, supabaseConfigured } from '@/lib/db';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { apiError, handleError } from '@/lib/api';

export const runtime = 'nodejs';

const PAGE_SIZE = 50;

/** The raw visit log: who arrived, from where, on what. */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const gate = rateLimit(clientKey(req, 'admin'), LIMITS.admin);
    if (!gate.ok) return apiError('Slow down.', 'RATE_LIMITED', 429);
    if (!supabaseConfigured()) return apiError('Supabase is not configured.', 'DB_UNCONFIGURED', 503);

    const page = Math.max(1, Math.min(200, Number(new URL(req.url).searchParams.get('page') ?? 1) || 1));
    const rows = await adminRecentVisits(PAGE_SIZE, (page - 1) * PAGE_SIZE);

    return NextResponse.json({ page, pageSize: PAGE_SIZE, rows, hasMore: rows.length === PAGE_SIZE });
  } catch (e) {
    return handleError(e);
  }
}
