-- Durable visitor chart forge jobs (cast + AI prose). Interrupt-safe.
create table if not exists chart_forge (
  id            text primary key,
  user_id       text,
  anon_key      text not null,
  fingerprint   text not null,
  status        text not null default 'pending',
  sign_id       text not null,
  birth_json    text not null default '{}',
  cast_json     text,
  nativity_json text,
  prose_chunks  text not null default '{}',
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists chart_forge_anon_fp_idx on chart_forge (anon_key, fingerprint);
create index if not exists chart_forge_user_fp_idx on chart_forge (user_id, fingerprint);
create index if not exists chart_forge_status_idx on chart_forge (status);
