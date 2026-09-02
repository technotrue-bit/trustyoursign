-- Optional clock and place for a deeper natal later.
alter table charts add column if not exists birth_hour integer;
alter table charts add column if not exists birth_minute integer;
alter table charts add column if not exists birth_place text;
