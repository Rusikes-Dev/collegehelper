import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Runtime settings. Everything the spec asks to change "with one click" lives
 * in the site_settings table, so the FREE/PAID toggle and the price take
 * effect without a deploy. Nothing here is read from an environment variable.
 */
export type AccessMode = 'FREE' | 'PAID';

export type Thresholds = {
  good_chance_percentile: number;
  possible_percentile: number;
  good_chance_rank_ratio: number;
  possible_rank_ratio: number;
};

export type Settings = {
  accessMode: AccessMode;
  pricePaise: number;
  currency: string;
  activeYear: string;
  thresholds: Thresholds;
  accessTtlDays: number | null;
  restoreRateLimit: { max_attempts: number; window_minutes: number };
  announcement: string | null;
};

const FALLBACK: Settings = {
  accessMode: 'FREE',
  pricePaise: 4900,
  currency: 'INR',
  activeYear: '2026-27',
  thresholds: {
    good_chance_percentile: 2,
    possible_percentile: -1,
    good_chance_rank_ratio: 0.1,
    possible_rank_ratio: -0.05,
  },
  accessTtlDays: null,
  restoreRateLimit: { max_attempts: 8, window_minutes: 60 },
  announcement: null,
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin()
    .from('site_settings')
    .select('key, value');

  // If settings are unreachable the predictor falls back to FREE rather than
  // charging someone under an unknown configuration.
  if (error || !data) return FALLBACK;

  const map = new Map(data.map((r: any) => [r.key, r.value]));
  const get = <T,>(key: string, fallback: T): T => {
    const v = map.get(key);
    return v === undefined || v === null ? fallback : (v as T);
  };

  return {
    accessMode: get<AccessMode>('predictor_access_mode', FALLBACK.accessMode),
    pricePaise: get('predictor_price_paise', FALLBACK.pricePaise),
    currency: get('predictor_currency', FALLBACK.currency),
    activeYear: get('predictor_active_year', FALLBACK.activeYear),
    thresholds: { ...FALLBACK.thresholds, ...get('predictor_thresholds', {}) },
    accessTtlDays: get<number | null>('access_grant_ttl_days', null),
    restoreRateLimit: get('restore_rate_limit', FALLBACK.restoreRateLimit),
    announcement: get<string | null>('site_announcement', null),
  };
}

export const formatPrice = (paise: number) =>
  `\u20B9${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
  })}`;
