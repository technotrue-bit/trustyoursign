-- Account cohort on the Better Auth user row.
-- Existing accounts become 'user'. 'beta' is reserved for early access
-- and does not unlock anything on its own yet.
-- Quoted to match the rest of the auth tables. Not under app RLS.

alter table "user"
  add column if not exists "role" text not null default 'user';
