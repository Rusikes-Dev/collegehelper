import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminUsers, supabaseConfigured } from '@/lib/db';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { apiError, handleError } from '@/lib/api';

export const runtime = 'nodejs';

const PAGE_SIZE = 25;

/** Searchable, filterable user list with access state and spend joined on. */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const gate = rateLimit(clientKey(req, 'admin'), LIMITS.admin);
    if (!gate.ok) return apiError('Slow down.', 'RATE_LIMITED', 429);
    if (!supabaseConfigured()) return apiError('Supabase is not configured.', 'DB_UNCONFIGURED', 503);

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
    const filter = ['all', 'paid', 'free', 'blocked'].includes(url.searchParams.get('filter') ?? '')
      ? url.searchParams.get('filter')!
      : 'all';
    const page = Math.max(1, Math.min(400, Number(url.searchParams.get('page') ?? 1) || 1));

    const data = await adminUsers(q, PAGE_SIZE, (page - 1) * PAGE_SIZE, filter);

    return NextResponse.json({
      page,
      pageSize: PAGE_SIZE,
      pages: Math.max(1, Math.ceil((data.total ?? 0) / PAGE_SIZE)),
      total: data.total ?? 0,
      rows: data.rows ?? [],
    });
  } catch (e) {
    return handleError(e);
  }
}
