-- P0: row-level security on user-owned app tables (least privilege).
-- App sets request GUCs via AppRls + getSql(): app.user_id, app.is_owner, app.rls_bypass.
-- Better Auth tables are intentionally untouched (separate pool; no GUCs there).

create or replace function app_rls_bypass() returns boolean
language sql stable as $$
  select nullif(current_setting('app.rls_bypass', true), '') = '1'
$$;

create or replace function app_rls_user_id() returns text
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')
$$;

create or replace function app_rls_is_owner() returns boolean
language sql stable as $$
  select nullif(current_setting('app.is_owner', true), '') = '1'
$$;

-- charts -----------------------------------------------------------
alter table charts enable row level security;
alter table charts force row level security;
drop policy if exists charts_tenant on charts;
create policy charts_tenant on charts
  for all
  using (
    app_rls_bypass()
    or app_rls_is_owner()
    or user_id = app_rls_user_id()
  )
  with check (
    app_rls_bypass()
    or app_rls_is_owner()
    or user_id = app_rls_user_id()
  );

-- legal_acceptances -----------------------------------------------
alter table legal_acceptances enable row level security;
alter table legal_acceptances force row level security;
drop policy if exists legal_acceptances_tenant on legal_acceptances;
create policy legal_acceptances_tenant on legal_acceptances
  for all
  using (
    app_rls_bypass()
    or app_rls_is_owner()
    or user_id = app_rls_user_id()
  )
  with check (
    app_rls_bypass()
    or app_rls_is_owner()
    or user_id = app_rls_user_id()
  );

-- chart_ask --------------------------------------------------------
alter table chart_ask enable row level security;
alter table chart_ask force row level security;
drop policy if exists chart_ask_tenant on chart_ask;
create policy chart_ask_tenant on chart_ask
  for all
  using (
    app_rls_bypass()
    or app_rls_is_owner()
    or user_id = app_rls_user_id()
  )
  with check (
    app_rls_bypass()
    or app_rls_is_owner()
    or user_id = app_rls_user_id()
  );

-- sky_pass ---------------------------------------------------------
alter table sky_pass enable row level security;
alter table sky_pass force row level security;
drop policy if exists sky_pass_tenant on sky_pass;
create policy sky_pass_tenant on sky_pass
  for all
  using (
    app_rls_bypass()
    or app_rls_is_owner()
    or user_id = app_rls_user_id()
  )
  with check (
    app_rls_bypass()
    or app_rls_is_owner()
    or user_id = app_rls_user_id()
  );

-- site_state (singleton; world-readable, owner/bypass writes) ------
alter table site_state enable row level security;
alter table site_state force row level security;
drop policy if exists site_state_read on site_state;
drop policy if exists site_state_write on site_state;
create policy site_state_read on site_state
  for select
  using (true);
create policy site_state_write on site_state
  for all
  using (app_rls_bypass() or app_rls_is_owner())
  with check (app_rls_bypass() or app_rls_is_owner());
