-- CollegeHelper.xyz — core schema
-- Postgres 15 / Supabase
--
-- Design notes
--   * Cutoff data is kept in its own dataset-scoped table so a new academic
--     year or CAP round is an INSERT, never a migration. Nothing in the app
--     hard-codes "2026-27" or "CAP Round I".
--   * Seat-type codes (GOPENS, LOBCH, ...) are stored verbatim exactly as the
--     official PDF prints them, with a lookup table holding the decoded
--     components. The predictor filters on the decoded columns; the raw code
--     is always shown to the user so it can be checked against the source.
--   * Marketplace tables (PG/hostel/mess, planned May 2027) are deliberately
--     absent, but colleges/locations are modelled so they can be added by
--     foreign-keying to colleges without touching anything here.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

-- Decoded seat-type codes. Populated from the PDF legend by
-- scripts/decode_seat_types.py — see data/seat_types.csv.
create table seat_types (
  code               text primary key,          -- verbatim, e.g. 'LOBCH'
  category_group     text not null,             -- OPEN, SC, ST, VJ, NT1..3, OBC, SEBC, EWS, TFWS, MINORITY, ORPHAN
  label              text not null,             -- human readable, from the legend
  gender             text not null default 'ANY' check (gender in ('ANY','FEMALE')),
  university_scope   text check (university_scope in ('HOME','OTHER','STATE','ALL_INDIA')),
  special            text,                      -- PWD, PWD_RESERVED, DEFENCE, DEFENCE_RESERVED, MINORITY, ORPHAN_*
  display_order      int not null default 100
);
create index on seat_types (category_group);
create index on seat_types (gender);

-- Canonical branch catalogue. Programs across colleges map onto these so the
-- predictor can offer "Computer Science and Engineering" once, not 300 times.
create table branches (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,               -- verbatim program name from the source
  short_name    text,
  -- Coarse grouping used only to keep the branch filter usable on mobile
  -- (there are 112 distinct program names). Assigned by keyword at import and
  -- freely editable in the admin panel; it is a UI convenience, not official
  -- DTE taxonomy, and never affects which cutoffs are matched.
  family        text,
  display_order int not null default 100,
  created_at    timestamptz not null default now()
);
create index on branches (name);
create index on branches (family);

-- ---------------------------------------------------------------------------
-- Colleges
-- ---------------------------------------------------------------------------

create table colleges (
  id                 uuid primary key default gen_random_uuid(),
  institute_code     text not null unique,      -- 5-digit DTE code, e.g. '06271'
  name               text not null,             -- official name, verbatim
  slug               text not null unique,
  short_name         text,
  description        text,

  -- Location. city/district are seeded from the institute's own registered
  -- name (scripts/derive_locations.py) and are NOT authoritative until an
  -- admin sets location_verified. Nothing else is inferred.
  address            text,
  city               text,
  district           text,
  state              text default 'Maharashtra',
  pincode            text,
  latitude           numeric(9,6),
  longitude          numeric(9,6),
  maps_url           text,
  location_verified  boolean not null default false,

  institute_type     text,                      -- Government / Un-Aided / Aided / Autonomous ...
  affiliation        text,                      -- home university, from the PDF status line
  established_year   int check (established_year between 1800 and 2100),
  website_url        text,
  admission_url      text,

  is_published       boolean not null default false,
  data_completeness  text not null default 'stub'
                     check (data_completeness in ('stub','partial','complete')),

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on colleges (city);
create index on colleges (district);
create index on colleges (institute_type);
create index on colleges (is_published);
create index colleges_name_trgm on colleges using gin (name gin_trgm_ops);

-- A program is one course offered by one college, keyed by the DTE course code.
-- The code may carry suffix letters (U = UnAided, K = Konkan, L = Regional
-- Language, F = Female, T = TFWS) — kept verbatim, decoded in choice_code_flags.
create table college_programs (
  id                 uuid primary key default gen_random_uuid(),
  college_id         uuid not null references colleges(id) on delete cascade,
  branch_id          uuid references branches(id) on delete set null,
  course_code        text not null,             -- e.g. '0627124510', '0302524270U'
  program_name       text not null,             -- verbatim from the PDF
  choice_code_flags  text[],                    -- decoded suffix letters
  status             text,                      -- 'Un-Aided Autonomous', ...
  home_university    text,
  intake             int,
  duration_years     int default 4,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  unique (college_id, course_code)
);
create index on college_programs (branch_id);
create index on college_programs (college_id);

-- Fees are per program, per category, per year. Values are entered by an
-- admin; the source PDFs contain no fee data, so these start empty.
create table program_fees (
  id                  uuid primary key default gen_random_uuid(),
  college_program_id  uuid not null references college_programs(id) on delete cascade,
  academic_year       text not null,
  category_group      text not null,            -- matches seat_types.category_group
  tuition_fee         numeric(12,2),
  development_fee     numeric(12,2),
  other_fees          numeric(12,2),
  total_fee           numeric(12,2),
  notes               text,
  updated_at          timestamptz not null default now(),
  unique (college_program_id, academic_year, category_group)
);

-- Free-form campus / placement blocks, admin-entered. Kept as typed rows
-- rather than one JSON blob so the admin UI can validate each field.
create table college_facts (
  id           uuid primary key default gen_random_uuid(),
  college_id   uuid not null references colleges(id) on delete cascade,
  section      text not null check (section in ('campus','placement','hostel','links')),
  key          text not null,
  value        text,
  academic_year text,
  display_order int not null default 100,
  unique (college_id, section, key, academic_year)
);
create index on college_facts (college_id, section);

-- ---------------------------------------------------------------------------
-- Cutoff data
-- ---------------------------------------------------------------------------

-- One row per imported document. Everything about provenance lives here so a
-- public cutoff table can always state exactly what it is showing.
create table cutoff_datasets (
  id                uuid primary key default gen_random_uuid(),
  exam              text not null default 'MHT-CET',
  academic_year     text not null,              -- '2026-27'
  cap_round         text not null,              -- 'CAP Round I'
  round_order       int not null,               -- 1, 2, 3 — for sorting
  source_document   text,                       -- original PDF filename
  source_url        text,
  source_checksum   text,                       -- sha256 of the PDF
  record_count      int not null default 0,
  imported_at       timestamptz not null default now(),
  imported_by       uuid,
  is_published      boolean not null default false,
  notes             text,
  unique (exam, academic_year, cap_round)
);

create table cutoff_records (
  id                  bigserial primary key,
  dataset_id          uuid not null references cutoff_datasets(id) on delete cascade,
  college_program_id  uuid not null references college_programs(id) on delete cascade,

  seat_type_code      text not null references seat_types(code),
  seat_level          text not null,            -- 'State Level', 'Home University Seats ...'
  stage               text,                     -- 'I', 'II', 'VII', 'I-Non PWD', 'I-Non Defence', 'MH'

  -- The source publishes closing figures only. Opening columns are absent by
  -- design: inventing them would mean deriving one from the other.
  closing_rank        integer,
  closing_percentile  numeric(10,7),

  source_page         int,                      -- page in the source PDF, for auditing
  created_at          timestamptz not null default now(),

  constraint cutoff_has_a_value check (closing_rank is not null
                                    or closing_percentile is not null),
  unique (dataset_id, college_program_id, seat_type_code, seat_level, stage)
);

-- Predictor hot path: filter by dataset + seat type, then range-scan the
-- user's percentile or rank.
create index cutoff_by_percentile
  on cutoff_records (dataset_id, seat_type_code, closing_percentile);
create index cutoff_by_rank
  on cutoff_records (dataset_id, seat_type_code, closing_rank);
create index cutoff_by_program
  on cutoff_records (college_program_id);
create index cutoff_by_seat_level
  on cutoff_records (dataset_id, seat_level);

-- ---------------------------------------------------------------------------
-- Users, sessions, payments, access
-- ---------------------------------------------------------------------------

create table app_users (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  email        citext not null,
  phone        text not null,                   -- E.164-ish, normalised to 10 digits + country
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (email, phone)
);
create index on app_users (email);
create index on app_users (phone);

create table predictor_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references app_users(id) on delete set null,
  anon_id           text,                       -- pre-signup browser token
  exam              text not null default 'MHT-CET',
  academic_year     text not null,
  rank_type         text not null check (rank_type in ('PERCENTILE','MERIT_RANK')),
  rank_value        numeric(12,4) not null,
  category_group    text,
  gender            text check (gender in ('ANY','FEMALE')),
  is_home_university boolean,
  home_university   text,
  preferred_branch_ids uuid[],
  preferred_cities  text[],
  cap_rounds        text[],
  result_count      int,
  created_at        timestamptz not null default now()
);
create index on predictor_sessions (user_id);
create index on predictor_sessions (created_at desc);

create table payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references app_users(id) on delete cascade,
  session_id          uuid references predictor_sessions(id) on delete set null,
  razorpay_order_id   text not null unique,
  razorpay_payment_id text unique,
  razorpay_signature  text,
  amount_paise        integer not null,          -- store minor units, never floats
  currency            text not null default 'INR',
  status              text not null default 'created'
                      check (status in ('created','attempted','paid','failed','refunded')),
  failure_reason      text,
  notes               jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on payments (user_id);
create index on payments (status);
create index on payments (created_at desc);

-- Access is a grant with a source, not a boolean on the user. A refund, a
-- manual admin grant and a free-mode grant are all distinguishable later.
create table access_grants (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references app_users(id) on delete cascade,
  source           text not null check (source in ('payment','admin','promo','free_mode')),
  payment_id       uuid references payments(id) on delete set null,
  granted_by_admin uuid,
  reason           text,
  expires_at       timestamptz,
  revoked_at       timestamptz,
  revoked_by_admin uuid,
  created_at       timestamptz not null default now()
);
create index on access_grants (user_id);
create index access_grants_active on access_grants (user_id)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Admin, settings, analytics
-- ---------------------------------------------------------------------------

-- Admin identity is an allowlist keyed to Supabase Auth users. Authorisation
-- is checked in RLS via is_admin(), never by hiding a URL.
create table admin_users (
  id          uuid primary key,                 -- = auth.users.id
  email       citext not null unique,
  role        text not null default 'admin' check (role in ('admin','superadmin')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Every runtime toggle the spec asks to change "with one click" lives here.
create table site_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table analytics_events (
  id          bigserial primary key,
  event       text not null,
  anon_id     text,
  user_id     uuid references app_users(id) on delete set null,
  path        text,
  referrer_host text,                            -- host only, never the full URL
  properties  jsonb,
  created_at  timestamptz not null default now()
);
create index on analytics_events (event, created_at desc);
create index on analytics_events (created_at desc);
create index on analytics_events (anon_id);

-- Simple abuse control for the restore-access endpoint.
create table rate_limits (
  id          bigserial primary key,
  bucket      text not null,                     -- e.g. 'restore:1.2.3.4'
  created_at  timestamptz not null default now()
);
create index on rate_limits (bucket, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger colleges_touch before update on colleges
  for each row execute function touch_updated_at();
create trigger app_users_touch before update on app_users
  for each row execute function touch_updated_at();
create trigger payments_touch before update on payments
  for each row execute function touch_updated_at();
