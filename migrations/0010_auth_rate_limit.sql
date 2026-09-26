-- Durable Better Auth rate limits (OTP send, sign-in, sign-up, passkey).
-- In-memory counters are per Vercel instance. This table is the shared store
-- Better Auth uses when rateLimit.storage = "database".
--
-- Quoted camelCase matches the other Better Auth tables. Not under app RLS:
-- the auth adapter does not set app.* GUCs (same as "user" / "session").
-- Rows hold a rate-limit key (client IP + path), not the OTP itself.
-- No Redis. Apply with the rest of migrations/; do not invent hosts.

create table if not exists "rateLimit" (
  "id" text not null primary key,
  "key" text not null unique,
  "count" integer not null,
  "lastRequest" bigint not null
);

create index if not exists "rateLimit_lastRequest_idx" on "rateLimit" ("lastRequest");
