alter table charts add column if not exists natal_json jsonb;
alter table charts add column if not exists tone text not null default 'vault';
alter table charts add column if not exists last_deep_at timestamptz;
alter table charts add column if not exists entitlement text not null default 'free';

alter table site_state add column if not exists ai_json jsonb;

create table if not exists sky_pass (
  user_id      text primary key,
  last_deep_at timestamptz,
  entitlement  text not null default 'free',
  updated_at   timestamptz not null default now()
);
