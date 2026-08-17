import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminOverview, adminTimeseries, adminBreakdown, supabaseConfigured } from '@/lib/db';
import { rateLimit, clientKey, LIMITS } from '@/lib/ratelimit';
import { apiError, handleError } from '@/lib/api';

export const runtime = 'nodejs';

const ALLOWED_DAYS = [1, 7, 30, 90, 365];

/**
 * Everything the dashboard needs in one round trip.
 *
 * The heavy lifting is done by SQL functions rather than by pulling rows into
 * Node, so the panel stays fast as the visits table grows past a few hundred
 * thousand rows.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const gate = rateLimit(clientKey(req, 'admin'), LIMITS.admin);
    if (!gate.ok) return apiError('Slow down.', 'RATE_LIMITED', 429);

    if (!supabaseConfigured()) {
      return apiError('Supabase is not configured, so there is nothing to report on yet.', 'DB_UNCONFIGURED', 503);
    }

    const url = new URL(req.url);
    const requested = Number(url.searchParams.get('days') ?? 30);
    const days = ALLOWED_DAYS.includes(requested) ? requested : 30;

    const [overview, series, sources, mediums, referrers, paths, devices, countries] = await Promise.all([
      adminOverview(days),
      adminTimeseries(Math.min(days, 90)),
      adminBreakdown(days, 'source'),
      adminBreakdown(days, 'medium'),
      adminBreakdown(days, 'referrer_host'),
      adminBreakdown(days, 'path'),
      adminBreakdown(days, 'device'),
      adminBreakdown(days, 'country'),
    ]);

    return NextResponse.json({
      days,
      overview,
      series,
      breakdowns: { sources, mediums, referrers, paths, devices, countries },
    });
  } catch (e) {
    return handleError(e);
  }
}
