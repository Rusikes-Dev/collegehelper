-- CollegeHelper.xyz — predictor query and default settings
--
-- The predictor never converts a rank into a percentile or vice versa. The
-- user picks one mode; the query compares that value against the same field in
-- the dataset and leaves the other field alone.
--
-- Comparison direction:
--   percentile — higher is better, so a seat is in reach when
--                user_percentile >= closing_percentile
--   merit rank — lower is better, so a seat is in reach when
--                user_rank <= closing_rank
--
-- "Chance" banding is not decided here. This function returns the raw margin
-- and the application applies admin-configured thresholds, so changing a
-- threshold in the admin panel takes effect without a migration.

create or replace function predict_colleges(
  p_academic_year   text,
  p_cap_rounds      text[]   default null,   -- null = all published rounds
  p_rank_type       text     default 'PERCENTILE',
  p_value           numeric  default null,
  p_category_group  text     default null,
  p_gender          text     default 'ANY',
  p_university_scope text[]  default null,   -- HOME / OTHER / STATE
  p_branch_ids      uuid[]   default null,
  p_cities          text[]   default null,
  p_specials        text[]   default null,   -- PWD, DEFENCE, ... null = plain seats only
  p_limit           int      default 400
)
returns table (
  college_id          uuid,
  college_name        text,
  college_slug        text,
  city                text,
  district            text,
  institute_type      text,
  institute_code      text,
  branch_id           uuid,
  branch_name         text,
  program_name        text,
  course_code         text,
  cap_round           text,
  round_order         int,
  seat_type_code      text,
  seat_type_label     text,
  seat_level          text,
  stage               text,
  closing_rank        integer,
  closing_percentile  numeric,
  margin              numeric   -- signed: positive means the user is ahead of the cutoff
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.name, c.slug, c.city, c.district, c.institute_type, c.institute_code,
    p.branch_id, b.name, p.program_name, p.course_code,
    d.cap_round, d.round_order,
    r.seat_type_code, st.label, r.seat_level, r.stage,
    r.closing_rank, r.closing_percentile,
    case
      when p_rank_type = 'PERCENTILE' then p_value - r.closing_percentile
      else (r.closing_rank - p_value)
    end as margin
  from cutoff_records r
  join cutoff_datasets d   on d.id = r.dataset_id
  join seat_types st       on st.code = r.seat_type_code
  join college_programs p  on p.id = r.college_program_id
  join colleges c          on c.id = p.college_id
  left join branches b     on b.id = p.branch_id
  where d.academic_year = p_academic_year
    and d.is_published
    and c.is_published
    and p.is_active
    and (p_cap_rounds is null or d.cap_round = any(p_cap_rounds))

    -- Category. A candidate is eligible for their own group; OPEN seats are
    -- open to everyone, so they are always included.
    and (p_category_group is null
         or st.category_group = p_category_group
         or st.category_group = 'OPEN')

    -- Gender. Female candidates additionally see the ladies-reserved seats;
    -- everyone sees the general ones.
    and (p_gender = 'FEMALE' or st.gender = 'ANY')

    and (p_university_scope is null
         or st.university_scope is null
         or st.university_scope = any(p_university_scope))

    -- Special seat types (PWD, Defence, Orphan, Minority) are opt-in. Without
    -- them a normal candidate would see cutoffs they cannot claim.
    and (case
           when p_specials is null then st.special is null
           else st.special is null or st.special = any(p_specials)
         end)

    and (p_branch_ids is null or p.branch_id = any(p_branch_ids))
    and (p_cities is null or c.city = any(p_cities))

    -- Mode-specific comparison. The unused field is never touched.
    and (case
           when p_rank_type = 'PERCENTILE'
             then r.closing_percentile is not null
           else r.closing_rank is not null
         end)
  order by
    case when p_rank_type = 'PERCENTILE'
         then p_value - r.closing_percentile
         else (r.closing_rank - p_value)::numeric
    end asc,
    d.round_order asc
  limit greatest(1, least(p_limit, 1000));
$$;

revoke all on function predict_colleges from public;
grant execute on function predict_colleges to service_role;

-- ---------------------------------------------------------------------------
-- Default settings. Every one of these is editable from /admin at runtime.
-- ---------------------------------------------------------------------------

insert into site_settings (key, value, description) values
  ('predictor_access_mode', '"FREE"'::jsonb,
   'FREE or PAID. One-click toggle controlling the predictor paywall.'),
  ('predictor_price_paise', '4900'::jsonb,
   'Price in paise. 4900 = Rs 49. Never hard-code the price in the app.'),
  ('predictor_currency', '"INR"'::jsonb,
   'ISO currency code passed to Razorpay.'),
  ('predictor_active_year', '"2026-27"'::jsonb,
   'Academic year the predictor queries by default.'),
  ('predictor_thresholds',
   '{"good_chance_percentile": 2.0, "possible_percentile": -1.0,
     "good_chance_rank_ratio": 0.10, "possible_rank_ratio": -0.05}'::jsonb,
   'Banding thresholds. Percentile values are absolute percentile points; rank ratios are fractions of the closing rank.'),
  ('access_grant_ttl_days', 'null'::jsonb,
   'Days a purchased access grant stays valid. null = never expires.'),
  ('restore_rate_limit', '{"max_attempts": 8, "window_minutes": 60}'::jsonb,
   'Abuse control for the Restore My Access endpoint.'),
  ('site_announcement', 'null'::jsonb,
   'Optional banner text shown site-wide. null hides the banner.')
on conflict (key) do nothing;
