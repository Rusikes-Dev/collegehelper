-- CollegeHelper.xyz — 0004: fix predictor result selection
--
-- Two bugs in 0003:
--
-- 1. ORDER BY margin ASC with LIMIT returned the 400 *hardest* options in the
--    whole dataset. A candidate on 98.11 has ~73,000 good-chance options and
--    saw none of them: every row came back "Reach".
--
-- 2. No deduplication. One college+branch+round appears once per seat type the
--    candidate qualifies for, so a handful of colleges filled the entire limit.
--    The old query returned 400 rows spanning just 15 colleges.
--
-- The fix: keep one row per college+branch+round (the easiest seat type the
-- candidate qualifies for, which is the one that actually decides admission),
-- then fill the limit with a quota per band rather than a single sort. Good
-- chances are shown best-college-first; reaches are shown nearest-miss-first,
-- because a candidate on 60 percentile does not need to be told that the
-- 99.99 college is out of reach.
--
-- Banding thresholds are passed in from site_settings so the admin panel still
-- controls them. The application re-bands the rows it receives; the thresholds
-- here only decide which rows are worth returning.

drop function if exists predict_colleges(
  text, text[], text, numeric, text, text, text[], uuid[], text[], text[], int);

create or replace function predict_colleges(
  p_academic_year    text,
  p_cap_rounds       text[]  default null,
  p_rank_type        text    default 'PERCENTILE',
  p_value            numeric default null,
  p_category_group   text    default null,
  p_gender           text    default 'ANY',
  p_university_scope text[]  default null,
  p_branch_ids       uuid[]  default null,
  p_cities           text[]  default null,
  p_specials         text[]  default null,
  p_limit            int     default 400,
  p_good_pct         numeric default 2.0,
  p_possible_pct     numeric default -1.0,
  p_good_ratio       numeric default 0.10,
  p_possible_ratio   numeric default -0.05
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
  margin              numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with eligible as (
    -- One row per college + branch + round. Within a group, keep the seat type
    -- that is easiest for this candidate: the lowest closing percentile, or the
    -- highest closing rank. That is the seat that would actually admit them.
    select distinct on (cl.id, cp.id, ds.cap_round)
      cl.id            as college_id,
      cl.name          as college_name,
      cl.slug          as college_slug,
      cl.city,
      cl.district,
      cl.institute_type,
      cl.institute_code,
      cp.branch_id,
      br.name          as branch_name,
      cp.program_name,
      cp.course_code,
      ds.cap_round,
      ds.round_order,
      cr.seat_type_code,
      sty.label        as seat_type_label,
      cr.seat_level,
      cr.stage,
      cr.closing_rank,
      cr.closing_percentile
    from cutoff_records cr
    join cutoff_datasets ds  on ds.id = cr.dataset_id
    join seat_types sty      on sty.code = cr.seat_type_code
    join college_programs cp on cp.id = cr.college_program_id
    join colleges cl         on cl.id = cp.college_id
    left join branches br    on br.id = cp.branch_id
    where ds.academic_year = p_academic_year
      and ds.is_published
      and cl.is_published
      and cp.is_active
      and (p_cap_rounds is null or ds.cap_round = any(p_cap_rounds))

      -- Own category plus OPEN, which is open to everyone.
      and (p_category_group is null
           or sty.category_group = p_category_group
           or sty.category_group = 'OPEN')

      -- Female candidates also see ladies-reserved seats.
      and (p_gender = 'FEMALE' or sty.gender = 'ANY')

      and (p_university_scope is null
           or sty.university_scope is null
           or sty.university_scope = any(p_university_scope))

      -- Special seat types are opt-in, so a candidate is never shown a cutoff
      -- they cannot claim.
      and (case
             when p_specials is null then sty.special is null
             else sty.special is null or sty.special = any(p_specials)
           end)

      and (p_branch_ids is null or cp.branch_id = any(p_branch_ids))
      and (p_cities is null or cl.city = any(p_cities))

      and (case
             when p_rank_type = 'PERCENTILE' then cr.closing_percentile is not null
             else cr.closing_rank is not null
           end)
    order by
      cl.id, cp.id, ds.cap_round,
      case when p_rank_type = 'PERCENTILE'
           then cr.closing_percentile
           else -cr.closing_rank::numeric
      end asc
  ),
  scored as (
    select e.*,
      case when p_rank_type = 'PERCENTILE'
           then p_value - e.closing_percentile
           else e.closing_rank - p_value
      end as margin
    from eligible e
  ),
  banded as (
    select s.*,
      case
        when p_rank_type = 'PERCENTILE' then
          case when s.margin >= p_good_pct     then 1
               when s.margin >= p_possible_pct then 2
               else 3 end
        else
          -- Rank thresholds are ratios of the closing rank, so one setting
          -- works for a cutoff of 900 and one of 190,000.
          case when s.margin / greatest(s.closing_rank, 1) >= p_good_ratio     then 1
               when s.margin / greatest(s.closing_rank, 1) >= p_possible_ratio then 2
               else 3 end
      end as band
    from scored s
  ),
  ranked as (
    select b.*,
      row_number() over (
        partition by b.band
        order by
          case
            -- Reaches: nearest miss first.
            when b.band = 3 then
              case when p_rank_type = 'PERCENTILE'
                   then b.closing_percentile
                   else -b.closing_rank::numeric end
            -- Good and possible: most competitive college first.
            else
              case when p_rank_type = 'PERCENTILE'
                   then -b.closing_percentile
                   else b.closing_rank::numeric end
          end asc
      ) as rn
    from banded b
  )
  select
    college_id, college_name, college_slug, city, district, institute_type,
    institute_code, branch_id, branch_name, program_name, course_code,
    cap_round, round_order, seat_type_code, seat_type_label, seat_level,
    stage, closing_rank, closing_percentile, margin
  from ranked
  where (band = 1 and rn <= greatest(1, (p_limit * 40) / 100))
     or (band = 2 and rn <= greatest(1, (p_limit * 35) / 100))
     or (band = 3 and rn <= greatest(1, (p_limit * 25) / 100))
  order by
    band asc,
    case when p_rank_type = 'PERCENTILE'
         then -closing_percentile
         else closing_rank::numeric
    end asc;
$$;

revoke all on function predict_colleges(
  text, text[], text, numeric, text, text, text[], uuid[], text[], text[],
  int, numeric, numeric, numeric, numeric) from public;

grant execute on function predict_colleges(
  text, text[], text, numeric, text, text, text[], uuid[], text[], text[],
  int, numeric, numeric, numeric, numeric) to service_role;
