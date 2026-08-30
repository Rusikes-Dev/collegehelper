-- CollegeHelper.xyz — Row Level Security
--
-- Principle: the browser's anon key can read published reference data and
-- nothing else. Every write, every payment record, every user row and every
-- cutoff result behind the paywall goes through a server route using the
-- service-role key, which bypasses RLS. So these policies are the second line
-- of defence, and they are deliberately restrictive: if a policy is missing,
-- the table is closed.

-- Is the caller an active admin? Used by every admin policy.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid() and is_active
  );
$$;

alter table seat_types          enable row level security;
alter table branches            enable row level security;
alter table colleges            enable row level security;
alter table college_programs    enable row level security;
alter table program_fees        enable row level security;
alter table college_facts       enable row level security;
alter table cutoff_datasets     enable row level security;
alter table cutoff_records      enable row level security;
alter table app_users           enable row level security;
alter table predictor_sessions  enable row level security;
alter table payments            enable row level security;
alter table access_grants       enable row level security;
alter table admin_users         enable row level security;
alter table site_settings       enable row level security;
alter table analytics_events    enable row level security;
alter table rate_limits         enable row level security;

-- --- Public reference data: readable by anyone, writable only by admins -----

create policy seat_types_read on seat_types
  for select using (true);
create policy branches_read on branches
  for select using (true);

create policy colleges_read on colleges
  for select using (is_published or is_admin());
create policy college_programs_read on college_programs
  for select using (
    exists (select 1 from colleges c
            where c.id = college_id and (c.is_published or is_admin()))
  );
create policy program_fees_read on program_fees
  for select using (
    exists (select 1 from college_programs p join colleges c on c.id = p.college_id
            where p.id = college_program_id and (c.is_published or is_admin()))
  );
create policy college_facts_read on college_facts
  for select using (
    exists (select 1 from colleges c
            where c.id = college_id and (c.is_published or is_admin()))
  );

-- Dataset metadata is public so cutoff tables can always name their source.
create policy cutoff_datasets_read on cutoff_datasets
  for select using (is_published or is_admin());

-- Cutoff rows are readable directly only for admins. Public access goes
-- through the predictor RPC / server routes, which apply the paywall.
create policy cutoff_records_admin_read on cutoff_records
  for select using (is_admin());

create policy seat_types_write on seat_types
  for all using (is_admin()) with check (is_admin());
create policy branches_write on branches
  for all using (is_admin()) with check (is_admin());
create policy colleges_write on colleges
  for all using (is_admin()) with check (is_admin());
create policy college_programs_write on college_programs
  for all using (is_admin()) with check (is_admin());
create policy program_fees_write on program_fees
  for all using (is_admin()) with check (is_admin());
create policy college_facts_write on college_facts
  for all using (is_admin()) with check (is_admin());
create policy cutoff_datasets_write on cutoff_datasets
  for all using (is_admin()) with check (is_admin());
create policy cutoff_records_write on cutoff_records
  for all using (is_admin()) with check (is_admin());

-- --- Personal and financial data: admins only via the anon key --------------
-- Everything else happens server-side with the service-role key.

create policy app_users_admin on app_users
  for all using (is_admin()) with check (is_admin());
create policy predictor_sessions_admin on predictor_sessions
  for all using (is_admin()) with check (is_admin());
create policy payments_admin on payments
  for all using (is_admin()) with check (is_admin());
create policy access_grants_admin on access_grants
  for all using (is_admin()) with check (is_admin());
create policy analytics_events_admin_read on analytics_events
  for select using (is_admin());
create policy rate_limits_admin on rate_limits
  for all using (is_admin()) with check (is_admin());

-- Admins can see the admin list; only a superadmin can change it.
create policy admin_users_read on admin_users
  for select using (is_admin());
create policy admin_users_write on admin_users
  for all using (
    exists (select 1 from admin_users a
            where a.id = auth.uid() and a.is_active and a.role = 'superadmin')
  ) with check (
    exists (select 1 from admin_users a
            where a.id = auth.uid() and a.is_active and a.role = 'superadmin')
  );

-- --- Settings ---------------------------------------------------------------
-- Public settings (predictor free/paid, price) must be readable by the site so
-- the paywall renders correctly. Secrets never live in this table.

create policy site_settings_read on site_settings
  for select using (true);
create policy site_settings_write on site_settings
  for all using (is_admin()) with check (is_admin());
