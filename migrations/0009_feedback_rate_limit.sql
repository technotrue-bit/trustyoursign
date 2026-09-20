-- P1-FEEDBACK: durable per-client feedback POST budget (5 / 15 min).
-- Keyed by SHA-256 of client IP (or anon), not raw IP. No user_id — not under
-- app RLS (anonymous contact form). OPS applies via migrate; do not invent hosts.

create table if not exists feedback_rate_limit (
  client_key_hash text primary key,
  window_start_ms bigint not null,
  hit_count integer not null default 0
    check (hit_count >= 0)
);

create index if not exists feedback_rate_limit_window_idx
  on feedback_rate_limit (window_start_ms);
