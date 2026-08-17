import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminRecentPayments, supabaseConfigured } from '@/lib/db';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { apiError, handleError } from '@/lib/api';

export const runtime = 'nodejs';

const PAGE_SIZE = 50;
const STATUSES = ['all', 'created', 'attempted', 'captured', 'failed'];

/** Every order, including the ones that never completed. */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const gate = rateLimit(clientKey(req, 'admin'), LIMITS.admin);
    if (!gate.ok) return apiError('Slow down.', 'RATE_LIMITED', 429);
    if (!supabaseConfigured()) return apiError('Supabase is not configured.', 'DB_UNCONFIGURED', 503);

    const url = new URL(req.url);
    const page = Math.max(1, Math.min(200, Number(url.searchParams.get('page') ?? 1) || 1));
    const status = STATUSES.includes(url.searchParams.get('status') ?? '') ? url.searchParams.get('status')! : 'all';

    const rows = await adminRecentPayments(PAGE_SIZE, (page - 1) * PAGE_SIZE, status);
    return NextResponse.json({ page, pageSize: PAGE_SIZE, status, rows, hasMore: rows.length === PAGE_SIZE });
  } catch (e) {
    return handleError(e);
  }
}
