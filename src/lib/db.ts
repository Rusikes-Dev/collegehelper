import 'server-only';
import { select, selectOne, insert, upsert, update, rpc, fireAndForget, supabaseConfigured } from './supabase';
import type { Attribution, DeviceInfo } from './attribution';

/**
 * Everything the application knows about a person, in one place.
 *
 * Access is granted to a *user*, not to a single search. That is what makes
 * "restore with the same email and phone" possible: the grant survives the
 * cookie, the device and the browser. It also means a student who paid can
 * change one branch and re-run the search without being charged again, which
 * is the single largest source of refund requests on tools like this.
 */

export const ACCESS_DAYS = Math.max(1, Number(process.env.ACCESS_VALIDITY_DAYS ?? 365));

export { supabaseConfigured };

/* ------------------------------------------------------------------ */
/* Row shapes                                                          */
/* ------------------------------------------------------------------ */

export interface DbUser {
  id: string;
  email: string;
  phone: string;
  name: string | null;
  blocked: boolean;
  notes: string | null;
  first_visitor_id: string | null;
  first_source: string | null;
  first_medium: string | null;
  first_campaign: string | null;
  first_referrer: string | null;
  first_landing: string | null;
  created_at: string;
  last_seen_at: string;
}

export interface DbAccessGrant {
  id: string;
  user_id: string;
  payment_id: string | null;
  source: 'payment' | 'admin' | 'promo';
  granted_by: string | null;
  note: string | null;
  starts_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface DbPayment {
  id: string;
  user_id: string | null;
  order_id: string;
  payment_id: string | null;
  amount_paise: number;
  currency: string;
  status: 'created' | 'attempted' | 'captured' | 'failed';
  method: string | null;
  email: string | null;
  phone: string | null;
  session_sid: string | null;
  search: unknown;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  error_code: string | null;
  error_description: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface AccessState {
  active: boolean;
  until: string | null;
  source: DbAccessGrant['source'] | null;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

/**
 * Finds or creates the user behind an (email, phone) pair.
 * First-touch attribution is written only on creation, never overwritten.
 */
export async function upsertUser(input: {
  email: string;
  phone: string;
  name?: string | null;
  visitorId?: string | null;
  attribution?: Attribution | null;
}): Promise<DbUser> {
  const existing = await findUser(input.email, input.phone);

  if (existing) {
    fireAndForget(() =>
      update<DbUser>('app_users', { id: existing.id }, {
        last_seen_at: new Date().toISOString(),
        ...(input.name && !existing.name ? { name: input.name } : {}),
      }),
    );
    return existing;
  }

  const a = input.attribution;
  const rows = await upsert<DbUser>(
    'app_users',
    {
      email: input.email,
      phone: input.phone,
      name: input.name ?? null,
      first_visitor_id: input.visitorId ?? null,
      first_source: a?.source ?? null,
      first_medium: a?.medium ?? null,
      first_campaign: a?.campaign ?? null,
      first_referrer: a?.referrer ?? null,
      first_landing: a?.landing ?? null,
    },
    'email,phone',
  );

  return rows[0];
}

export async function findUser(email: string, phone: string): Promise<DbUser | null> {
  return selectOne<DbUser>('app_users', { email: `eq.${email}`, phone: `eq.${phone}`, select: '*' });
}

export async function findUserById(id: string): Promise<DbUser | null> {
  return selectOne<DbUser>('app_users', { id: `eq.${id}`, select: '*' });
}

export async function setUserFlags(id: string, patch: { blocked?: boolean; notes?: string | null }): Promise<void> {
  await update('app_users', { id }, patch);
  accessCache.delete(id);
}

/* ------------------------------------------------------------------ */
/* Access                                                              */
/* ------------------------------------------------------------------ */

/**
 * Access is checked on every paid request, so the answer is cached briefly.
 * Thirty seconds keeps a revoked grant from lingering long enough to matter
 * while removing almost all of the round trips.
 */
const accessCache = new Map<string, { value: AccessState; until: number }>();
const ACCESS_TTL_MS = 30_000;

export async function getAccessState(userId: string): Promise<AccessState> {
  const hit = accessCache.get(userId);
  if (hit && hit.until > Date.now()) return hit.value;

  const grants = await select<DbAccessGrant>('access_grants', {
    user_id: `eq.${userId}`,
    revoked_at: 'is.null',
    select: 'id,source,starts_at,expires_at,revoked_at',
    order: 'created_at.desc',
    limit: 20,
  });

  const now = Date.now();
  const live = grants.filter(
    (g) => new Date(g.starts_at).getTime() <= now && (!g.expires_at || new Date(g.expires_at).getTime() > now),
  );

  // Lifetime grants sort ahead of dated ones.
  const best = live.reduce<DbAccessGrant | null>((acc, g) => {
    if (!acc) return g;
    if (!acc.expires_at || !g.expires_at) return acc.expires_at ? g : acc;
    return new Date(g.expires_at) > new Date(acc.expires_at) ? g : acc;
  }, null);

  const value: AccessState = {
    active: Boolean(best),
    until: best?.expires_at ?? null,
    source: best?.source ?? null,
  };

  accessCache.set(userId, { value, until: Date.now() + ACCESS_TTL_MS });
  return value;
}

export async function grantAccess(input: {
  userId: string;
  source: DbAccessGrant['source'];
  days?: number | null; // null or 0 means it never expires
  note?: string | null;
  grantedBy?: string | null;
  paymentRowId?: string | null;
}): Promise<DbAccessGrant> {
  const days = input.days === null || input.days === 0 ? null : (input.days ?? ACCESS_DAYS);
  const expires = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;

  const rows = await insert<DbAccessGrant>('access_grants', {
    user_id: input.userId,
    source: input.source,
    note: input.note ?? null,
    granted_by: input.grantedBy ?? null,
    payment_id: input.paymentRowId ?? null,
    expires_at: expires,
  });

  accessCache.delete(input.userId);
  return rows[0];
}

export async function revokeAccessForUser(userId: string, by: string): Promise<number> {
  const rows = await update<DbAccessGrant>('access_grants', { user_id: userId }, {
    revoked_at: new Date().toISOString(),
    note: `revoked by ${by}`,
  });
  accessCache.delete(userId);
  return rows.length;
}

export function listGrants(userId: string): Promise<DbAccessGrant[]> {
  return select<DbAccessGrant>('access_grants', {
    user_id: `eq.${userId}`,
    select: '*',
    order: 'created_at.desc',
    limit: 50,
  });
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export async function recordOrder(input: {
  orderId: string;
  amountPaise: number;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  sessionSid?: string | null;
  search?: unknown;
  attribution?: Attribution | null;
}): Promise<DbPayment | null> {
  const a = input.attribution;
  const rows = await upsert<DbPayment>(
    'payments',
    {
      order_id: input.orderId,
      amount_paise: input.amountPaise,
      user_id: input.userId ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      session_sid: input.sessionSid ?? null,
      search: input.search ?? null,
      source: a?.source ?? null,
      medium: a?.medium ?? null,
      campaign: a?.campaign ?? null,
      referrer: a?.referrer ?? null,
      status: 'created',
    },
    'order_id',
  );
  return rows[0] ?? null;
}

export async function findPaymentByOrder(orderId: string): Promise<DbPayment | null> {
  return selectOne<DbPayment>('payments', { order_id: `eq.${orderId}`, select: '*' });
}

export async function markPaymentCaptured(input: {
  orderId: string;
  paymentId: string;
  method?: string | null;
  amountPaise?: number;
}): Promise<DbPayment | null> {
  const rows = await update<DbPayment>('payments', { order_id: input.orderId }, {
    payment_id: input.paymentId,
    status: 'captured',
    method: input.method ?? null,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(input.amountPaise ? { amount_paise: input.amountPaise } : {}),
  });
  return rows[0] ?? null;
}

export async function markPaymentFailed(input: {
  orderId: string;
  paymentId?: string | null;
  code?: string | null;
  description?: string | null;
}): Promise<void> {
  await update('payments', { order_id: input.orderId }, {
    status: 'failed',
    payment_id: input.paymentId ?? null,
    error_code: input.code ?? null,
    error_description: (input.description ?? '').slice(0, 300) || null,
    updated_at: new Date().toISOString(),
  });
}

export function listPaymentsForUser(userId: string): Promise<DbPayment[]> {
  return select<DbPayment>('payments', {
    user_id: `eq.${userId}`,
    select: '*',
    order: 'created_at.desc',
    limit: 50,
  });
}

/* ------------------------------------------------------------------ */
/* Traffic                                                             */
/* ------------------------------------------------------------------ */

export function recordVisit(input: {
  visitorId: string;
  userId?: string | null;
  path: string;
  referrer?: string | null;
  attribution?: Attribution | null;
  landing: boolean;
  device: DeviceInfo;
  country?: string | null;
  region?: string | null;
  city?: string | null;
}): void {
  const a = input.attribution;
  fireAndForget(() =>
    insert('visits', {
      visitor_id: input.visitorId,
      user_id: input.userId ?? null,
      path: input.path.slice(0, 200),
      referrer: (input.referrer ?? '').slice(0, 300) || null,
      referrer_host: a?.referrerHost ?? null,
      source: a?.source ?? null,
      medium: a?.medium ?? null,
      campaign: a?.campaign ?? null,
      term: a?.term ?? null,
      content: a?.content ?? null,
      landing: input.landing,
      device: input.device.device,
      os: input.device.os,
      browser: input.device.browser,
      country: input.country ?? null,
      region: input.region ?? null,
      city: input.city ?? null,
    }, 'return=minimal'),
  );
}

export function recordEvent(input: {
  name: string;
  visitorId?: string | null;
  userId?: string | null;
  props?: Record<string, unknown>;
}): void {
  if (!supabaseConfigured()) return;
  fireAndForget(() =>
    insert('events', {
      name: input.name.slice(0, 60),
      visitor_id: input.visitorId ?? null,
      user_id: input.userId ?? null,
      props: input.props ?? null,
    }, 'return=minimal'),
  );
}

export function audit(action: string, target: string | null, detail?: Record<string, unknown>): void {
  fireAndForget(() =>
    insert('admin_audit', { action, target, detail: detail ?? null }, 'return=minimal'),
  );
}

/* ------------------------------------------------------------------ */
/* Admin reads                                                         */
/* ------------------------------------------------------------------ */

export interface Overview {
  days: number; visitors: number; pageviews: number; landings: number;
  searches: number; paywall_views: number; contacts: number;
  orders: number; paid: number; failed: number; revenue_paise: number;
  total_users: number; total_paid: number; total_revenue_paise: number; active_access: number;
}

export const adminOverview = (days: number) => rpc<Overview>('admin_overview', { p_days: days });

export const adminTimeseries = (days: number) =>
  rpc<{ day: string; visitors: number; pageviews: number; searches: number; paid: number; revenue_paise: number }[]>(
    'admin_timeseries', { p_days: days },
  );

export const adminBreakdown = (days: number, dimension: string) =>
  rpc<{ label: string; visitors: number; pageviews: number }[]>('admin_breakdown', {
    p_days: days, p_dimension: dimension,
  });

export interface AdminUserRow extends DbUser {
  has_access: boolean;
  access_until: string | null;
  payment_count: number;
  spend_paise: number;
}

export const adminUsers = (search: string, limit: number, offset: number, filter: string) =>
  rpc<{ total: number; rows: AdminUserRow[] }>('admin_users', {
    p_search: search, p_limit: limit, p_offset: offset, p_filter: filter,
  });

export function adminRecentVisits(limit = 100, offset = 0) {
  return select<{
    id: number; visitor_id: string; path: string; source: string | null; medium: string | null;
    campaign: string | null; referrer_host: string | null; device: string | null; os: string | null;
    browser: string | null; country: string | null; landing: boolean; created_at: string;
  }>('visits', {
    select: 'id,visitor_id,path,source,medium,campaign,referrer_host,device,os,browser,country,landing,created_at',
    order: 'created_at.desc',
    limit,
    offset,
  });
}

export function adminRecentPayments(limit = 100, offset = 0, status?: string) {
  return select<DbPayment>('payments', {
    select: '*',
    order: 'created_at.desc',
    limit,
    offset,
    ...(status && status !== 'all' ? { status: `eq.${status}` } : {}),
  });
}

export function adminAuditLog(limit = 100) {
  return select<{ id: number; action: string; target: string | null; detail: unknown; created_at: string }>(
    'admin_audit', { select: '*', order: 'created_at.desc', limit },
  );
}
