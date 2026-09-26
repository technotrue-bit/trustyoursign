-- Owner research books. The payload is seeded out of band from seeds/private/
-- (gitignored). This migration creates an empty table — do not paste natal
-- JSON into git.
--
-- FORCE RLS: the app connects as the table owner. Reads require app.is_owner
-- or app.rls_bypass (set only after the server has already checked the owner).

create table if not exists research_nativity (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table research_nativity enable row level security;
alter table research_nativity force row level security;

drop policy if exists research_nativity_owner on research_nativity;
create policy research_nativity_owner on research_nativity
  for all
  using (app_rls_bypass() or app_rls_is_owner())
  with check (app_rls_bypass() or app_rls_is_owner());
