-- Passkey (WebAuthn) credentials for @better-auth/passkey.
--
-- CamelCase columns match Better Auth's Postgres adapter (same convention as
-- migrations/0001_auth.sql). Better Auth tables stay outside app RLS — the
-- auth pool does not set app.* GUCs (see migrations/0007_rls.sql).

create table if not exists "passkey" (
  "id" text not null primary key,
  "name" text,
  "publicKey" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "credentialID" text not null,
  "counter" integer not null,
  "deviceType" text not null,
  "backedUp" boolean not null,
  "transports" text,
  "createdAt" timestamptz,
  "aaguid" text
);

create index if not exists "passkey_userId_idx" on "passkey" ("userId");
create index if not exists "passkey_credentialID_idx" on "passkey" ("credentialID");
