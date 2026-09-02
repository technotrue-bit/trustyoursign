-- Ask threads and field notes, scoped to the signed-in user and a chart key.
create table if not exists chart_ask (
  user_id      text not null,
  chart_key    text not null,
  thread_json  text not null default '[]',
  notes_json   text not null default '[]',
  updated_at   timestamptz not null default now(),
  primary key (user_id, chart_key)
);
create index if not exists chart_ask_user_id_idx on chart_ask (user_id);
