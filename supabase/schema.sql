-- =====================================================================
-- JEE College Finder — Supabase schema
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New
-- query → paste → Run). Re-running is safe: every statement is guarded.
--
-- Every table has RLS enabled with no policies, which means the anon and
-- authenticated keys can read nothing at all. The app talks to these tables
-- only from the server with the service-role key, which bypasses RLS. That
-- is deliberate: the browser must never be able to read another student's
-- email, phone number or payment.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- app_users — one row per (email, phone) pair.
--
-- The pair is the credential used to restore access, so it is the unique
-- key. Someone who signs up with a typo creates a separate row rather than
-- silently taking over an existing one.
-- ---------------------------------------------------------------------
create table if not exists public.app_users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  phone           text not null,                       -- normalised, 10 digits
  name            text,
  blocked         boolean not null default false,
  notes           text,

  -- first-touch attribution, copied from the visitor cookie at signup
  first_visitor_id text,
  first_source     text,
  first_medium     text,
  first_campaign   text,
  first_referrer   text,
  first_landing    text,

  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),

  constraint app_users_email_phone_key unique (email, phone)
);

create index if not exists app_users_email_idx      on public.app_users (email);
create index if not exists app_users_phone_idx      on public.app_users (phone);
create index if not exists app_users_created_at_idx on public.app_users (created_at desc);

-- ---------------------------------------------------------------------
-- payments — one row per Razorpay order, from creation to outcome.
--
-- The row is written when the order is created, not when it succeeds, so
-- abandoned and failed attempts are visible in the admin panel instead of
-- disappearing.
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.app_users (id) on delete set null,
  order_id          text not null unique,
  payment_id        text unique,
  amount_paise      integer not null,
  currency          text not null default 'INR',
  -- created → attempted → captured | failed
  status            text not null default 'created',
  method            text,
  email             text,
  phone             text,
  session_sid       text,
  -- snapshot of the search this payment was for, for support queries
  search            jsonb,
  source            text,
  medium            text,
  campaign          text,
  referrer          text,
  error_code        text,
  error_description text,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists payments_user_idx       on public.payments (user_id);
create index if not exists payments_status_idx     on public.payments (status);
create index if not exists payments_created_at_idx on public.payments (created_at desc);

-- ---------------------------------------------------------------------
-- access_grants — what actually unlocks results.
--
-- Access belongs to the user, not to a single search, so a student who
-- paid can come back on a new phone, restore with their email and phone,
-- and run the search again. expires_at null means it never lapses.
-- ---------------------------------------------------------------------
create table if not exists public.access_grants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.app_users (id) on delete cascade,
  payment_id  uuid references public.payments (id) on delete set null,
  -- payment: bought it. admin: granted by you. promo: campaign or goodwill.
  source      text not null default 'payment'
              check (source in ('payment', 'admin', 'promo')),
  granted_by  text,
  note        text,
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists access_grants_user_idx on public.access_grants (user_id);
create index if not exists access_grants_live_idx on public.access_grants (user_id, revoked_at, expires_at);

-- ---------------------------------------------------------------------
-- visits — one row per page view.
--
-- visitor_id is a random id in a first-party cookie. No IP address is
-- stored; country comes from the edge header and is kept at country level.
-- ---------------------------------------------------------------------
create table if not exists public.visits (
  id            bigserial primary key,
  visitor_id    text not null,
  user_id       uuid references public.app_users (id) on delete set null,
  path          text not null,
  referrer      text,
  referrer_host text,
  source        text,          -- utm_source, or the referrer host, or 'direct'
  medium        text,          -- utm_medium, or 'organic' / 'referral' / 'none'
  campaign      text,
  term          text,
  content       text,
  landing       boolean not null default false,
  device        text,          -- mobile | tablet | desktop
  os            text,
  browser       text,
  country       text,
  region        text,
  city          text,
  created_at    timestamptz not null default now()
);

create index if not exists visits_created_at_idx on public.visits (created_at desc);
create index if not exists visits_visitor_idx    on public.visits (visitor_id);
create index if not exists visits_source_idx     on public.visits (source);
create index if not exists visits_path_idx       on public.visits (path);

-- ---------------------------------------------------------------------
-- events — funnel milestones. Counts, never rank values or personal data.
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id         bigserial primary key,
  visitor_id text,
  user_id    uuid references public.app_users (id) on delete set null,
  name       text not null,
  props      jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_created_at_idx on public.events (created_at desc);
create index if not exists events_name_idx       on public.events (name, created_at desc);

-- ---------------------------------------------------------------------
-- admin_audit — every admin action that changes access, kept forever.
-- ---------------------------------------------------------------------
create table if not exists public.admin_audit (
  id         bigserial primary key,
  action     text not null,
  target     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_at_idx on public.admin_audit (created_at desc);

-- ---------------------------------------------------------------------
-- Lock everything down. No policies are defined, so only the service-role
-- key (server-side) can touch these tables.
-- ---------------------------------------------------------------------
alter table public.app_users     enable row level security;
alter table public.payments      enable row level security;
alter table public.access_grants enable row level security;
alter table public.visits        enable row level security;
alter table public.events        enable row level security;
alter table public.admin_audit   enable row level security;

-- ---------------------------------------------------------------------
-- has_active_access(uuid) — the single definition of "is unlocked".
-- ---------------------------------------------------------------------
create or replace function public.has_active_access(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.access_grants g
     where g.user_id = p_user
       and g.revoked_at is null
       and g.starts_at <= now()
       and (g.expires_at is null or g.expires_at > now())
  );
$$;

-- ---------------------------------------------------------------------
-- admin_overview(days) — headline numbers for the dashboard.
-- ---------------------------------------------------------------------
create or replace function public.admin_overview(p_days integer default 30)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with span as (select (now() - make_interval(days => p_days)) as since)
  select json_build_object(
    'days',           p_days,
    'visitors',       (select count(distinct visitor_id) from visits, span where created_at >= span.since),
    'pageviews',      (select count(*)                   from visits, span where created_at >= span.since),
    'landings',       (select count(*)                   from visits, span where created_at >= span.since and landing),
    'searches',       (select count(*)                   from events, span where created_at >= span.since and name = 'search_run'),
    'paywall_views',  (select count(*)                   from events, span where created_at >= span.since and name = 'paywall_view'),
    'contacts',       (select count(*)                   from app_users, span where created_at >= span.since),
    'orders',         (select count(*)                   from payments, span where created_at >= span.since),
    'paid',           (select count(*)                   from payments, span where created_at >= span.since and status = 'captured'),
    'failed',         (select count(*)                   from payments, span where created_at >= span.since and status = 'failed'),
    'revenue_paise',  (select coalesce(sum(amount_paise), 0) from payments, span where created_at >= span.since and status = 'captured'),
    'total_users',    (select count(*) from app_users),
    'total_paid',     (select count(*) from payments where status = 'captured'),
    'total_revenue_paise', (select coalesce(sum(amount_paise), 0) from payments where status = 'captured'),
    'active_access',  (select count(distinct user_id) from access_grants
                        where revoked_at is null and starts_at <= now()
                          and (expires_at is null or expires_at > now()))
  );
$$;

-- ---------------------------------------------------------------------
-- admin_timeseries(days) — one row per day for the dashboard chart.
-- ---------------------------------------------------------------------
create or replace function public.admin_timeseries(p_days integer default 30)
returns table (
  day           date,
  visitors      bigint,
  pageviews     bigint,
  searches      bigint,
  paid          bigint,
  revenue_paise bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      (current_date - (p_days - 1)),
      current_date,
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    coalesce((select count(distinct v.visitor_id) from visits v   where v.created_at::date = d.day), 0),
    coalesce((select count(*)                     from visits v   where v.created_at::date = d.day), 0),
    coalesce((select count(*)                     from events e   where e.created_at::date = d.day and e.name = 'search_run'), 0),
    coalesce((select count(*)                     from payments p where p.paid_at::date    = d.day and p.status = 'captured'), 0),
    coalesce((select sum(p.amount_paise)          from payments p where p.paid_at::date    = d.day and p.status = 'captured'), 0)
  from days d
  order by d.day;
$$;

-- ---------------------------------------------------------------------
-- admin_breakdown(days, dimension) — traffic grouped by one column.
-- dimension is one of: source, medium, campaign, referrer_host, path,
-- device, country.
-- ---------------------------------------------------------------------
create or replace function public.admin_breakdown(
  p_days integer default 30,
  p_dimension text default 'source'
)
returns table (label text, visitors bigint, pageviews bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  col text;
begin
  col := case p_dimension
           when 'source'        then 'source'
           when 'medium'        then 'medium'
           when 'campaign'      then 'campaign'
           when 'referrer_host' then 'referrer_host'
           when 'path'          then 'path'
           when 'device'        then 'device'
           when 'country'       then 'country'
           else 'source'
         end;

  return query execute format(
    'select coalesce(nullif(%I, %L), %L)::text as label,
            count(distinct visitor_id)         as visitors,
            count(*)                           as pageviews
       from visits
      where created_at >= now() - make_interval(days => $1)
      group by 1
      order by 2 desc
      limit 50',
    col, '', 'unknown'
  ) using p_days;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_users(search, limit, offset) — the users table with access state
-- and spend joined on, so the panel needs one round trip per page.
-- ---------------------------------------------------------------------
create or replace function public.admin_users(
  p_search text default '',
  p_limit  integer default 50,
  p_offset integer default 0,
  p_filter text default 'all'   -- all | paid | free | blocked
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      u.*,
      public.has_active_access(u.id) as has_access,
      -- Only live grants count. A lifetime grant reports null (never expires)
      -- rather than being shadowed by a shorter dated one.
      (select case when bool_or(g.expires_at is null) then null else max(g.expires_at) end
         from access_grants g
        where g.user_id = u.id
          and g.revoked_at is null
          and g.starts_at <= now()
          and (g.expires_at is null or g.expires_at > now()))    as access_until,
      (select count(*) from payments p
        where p.user_id = u.id and p.status = 'captured')        as payment_count,
      (select coalesce(sum(p.amount_paise), 0) from payments p
        where p.user_id = u.id and p.status = 'captured')        as spend_paise
    from app_users u
    where (
      p_search = ''
      or u.email ilike '%' || p_search || '%'
      or u.phone ilike '%' || p_search || '%'
      or coalesce(u.name, '') ilike '%' || p_search || '%'
    )
  ),
  filtered as (
    select * from base
    where case p_filter
            when 'paid'    then has_access
            when 'free'    then not has_access
            when 'blocked' then blocked
            else true
          end
  )
  select json_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select json_agg(row_to_json(f) order by f.created_at desc)
      from (select * from filtered order by created_at desc limit p_limit offset p_offset) f
    ), '[]'::json)
  );
$$;
