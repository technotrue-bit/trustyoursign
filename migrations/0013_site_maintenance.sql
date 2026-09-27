-- Holding screen for everyone but the site owner.
-- site_state stays world-readable; only an owner write (or bypass after
-- the owner check) can change this. Default off so the sky stays open.

alter table site_state
  add column if not exists maintenance boolean not null default false;
