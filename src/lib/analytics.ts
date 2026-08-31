import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * First-party analytics. No third-party script, no cookie beyond the anonymous
 * id, and no full referrer URL: only the referring host is stored, which is
 * enough to tell Instagram traffic from search without recording where an
 * individual came from.
 */
export const TRACKED_EVENTS = [
  'page_view',
  'predictor_started',
  'predictor_completed',
  'payment_started',
  'payment_success',
  'payment_failed',
  'access_restored',
  'college_search',
  'college_page_view',
] as const;

export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

export function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).host;
  } catch {
    return null;
  }
}

export async function track(
  event: TrackedEvent,
  opts: {
    anonId?: string | null;
    userId?: string | null;
    path?: string | null;
    referrerHost?: string | null;
    properties?: Record<string, unknown>;
  } = {},
) {
  try {
    await supabaseAdmin().from('analytics_events').insert({
      event,
      anon_id: opts.anonId ?? null,
      user_id: opts.userId ?? null,
      path: opts.path ?? null,
      referrer_host: opts.referrerHost ?? null,
      properties: opts.properties ?? {},
    });
  } catch (e) {
    // Analytics must never break a user flow.
    console.error('analytics insert failed', e);
  }
}
