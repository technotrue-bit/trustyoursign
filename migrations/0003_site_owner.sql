create table if not exists site_state (
  id             text primary key,
  owner_user_id  text,
  owner_name     text not null,
  owner_handle   text not null,
  claimed_at     timestamptz
);

insert into site_state (id, owner_name, owner_handle)
values ('vault', 'Devin Norris', 'ItsMeTrueG')
on conflict (id) do nothing;
