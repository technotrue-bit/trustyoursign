-- Saved natal sketches, scoped to the signed-in user.
create table if not exists charts (
  id           text primary key,
  user_id      text not null,
  label        text not null,
  relation     text not null default 'self',
  person_name  text,
  sign_id      text not null,
  birth_month  integer not null,
  birth_day    integer not null,
  birth_year   integer not null,
  consent_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists charts_user_id_idx on charts (user_id);
create index if not exists charts_user_relation_idx on charts (user_id, relation);

create table if not exists legal_acceptances (
  user_id          text not null,
  terms_version    text not null,
  privacy_version  text not null,
  accepted_at      timestamptz not null default now(),
  primary key (user_id, terms_version, privacy_version)
);
