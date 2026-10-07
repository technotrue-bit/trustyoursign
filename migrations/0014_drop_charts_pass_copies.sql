-- The deep-cut clock and the pass live on sky_pass.
-- These copies on a saved chart were never read. Drop only those two.

alter table charts drop column if exists last_deep_at;
alter table charts drop column if exists entitlement;
