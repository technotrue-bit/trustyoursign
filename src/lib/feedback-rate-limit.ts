/**
 * Durable feedback rate limit (P1-FEEDBACK) — 5 notes / 15 minutes per client.
 *
 * Production path: Postgres `feedback_rate_limit` (same DB as the app).
 * Unit tests inject a memory store — no live DB required.
 */

import { createHash } from "node:crypto";
import type { Sql } from "./db.ts";

export const FEEDBACK_RATE_WINDOW_MS = 15 * 60 * 1000;
export const FEEDBACK_RATE_MAX = 5;

export type FeedbackRateLimitStore = {
  /** Consume one slot. `true` = allowed, `false` = over budget. */
  consume(clientKey: string, now?: number): boolean | Promise<boolean>;
  /** Test helper — wipe buckets / rows for this store instance. */
  reset?(): void | Promise<void>;
};

type Bucket = { count: number; resetAt: number };

/** Hash client IP (or anon key) so the table never stores raw addresses. */
export function hashFeedbackClientKey(clientKey: string): string {
  const key = clientKey.trim().slice(0, 120) || "anon";
  return createHash("sha256").update(`tys-feedback-rl:v1:${key}`).digest("hex");
}

export function createMemoryFeedbackRateLimitStore(): FeedbackRateLimitStore {
  const buckets = new Map<string, Bucket>();
  return {
    consume(clientKey: string, now = Date.now()): boolean {
      const key = hashFeedbackClientKey(clientKey);
      const existing = buckets.get(key);
      if (!existing || now >= existing.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + FEEDBACK_RATE_WINDOW_MS });
        return true;
      }
      if (existing.count >= FEEDBACK_RATE_MAX) return false;
      existing.count += 1;
      return true;
    },
    reset() {
      buckets.clear();
    },
  };
}

/**
 * Atomic upsert against `feedback_rate_limit`. Window resets when expired.
 * `sql` is injectable for tests (fake runner) and production (`getSql()`).
 */
export function createPostgresFeedbackRateLimitStore(
  sql: Sql,
  opts?: { onError?: (err: unknown) => void },
): FeedbackRateLimitStore {
  return {
    async consume(clientKey: string, now = Date.now()): Promise<boolean> {
      const hash = hashFeedbackClientKey(clientKey);
      try {
        const rows = await sql<{ hit_count: number }>`
          insert into feedback_rate_limit as t (client_key_hash, window_start_ms, hit_count)
          values (${hash}, ${now}, 1)
          on conflict (client_key_hash) do update set
            window_start_ms = case
              when t.window_start_ms + ${FEEDBACK_RATE_WINDOW_MS} <= ${now} then ${now}
              else t.window_start_ms
            end,
            hit_count = case
              when t.window_start_ms + ${FEEDBACK_RATE_WINDOW_MS} <= ${now} then 1
              else t.hit_count + 1
            end
          returning hit_count
        `;
        const hitCount = Number(rows[0]?.hit_count ?? FEEDBACK_RATE_MAX + 1);
        return hitCount <= FEEDBACK_RATE_MAX;
      } catch (err) {
        opts?.onError?.(err);
        // Fail closed on DB errors so a broken limiter cannot become open relay.
        return false;
      }
    },
    async reset() {
      await sql`delete from feedback_rate_limit`;
    },
  };
}

let defaultMemoryStore: FeedbackRateLimitStore | null = null;
let defaultPostgresStore: FeedbackRateLimitStore | null = null;
let defaultPostgresPromise: Promise<FeedbackRateLimitStore> | null = null;

/** Test helper — clear module singletons + memory fallback. */
export function resetFeedbackRateLimitStores(): void {
  defaultMemoryStore?.reset?.();
  defaultMemoryStore = null;
  defaultPostgresStore = null;
  defaultPostgresPromise = null;
}

function getMemoryFallback(): FeedbackRateLimitStore {
  defaultMemoryStore ??= createMemoryFeedbackRateLimitStore();
  return defaultMemoryStore;
}

/**
 * App default: durable Postgres via `getSql()`. Lazy so unit tests that inject
 * a store never open a DB. On init failure, fall back to per-instance memory
 * (still soft-limits; never fails open unbounded).
 */
export async function getDefaultFeedbackRateLimitStore(): Promise<FeedbackRateLimitStore> {
  if (defaultPostgresStore) return defaultPostgresStore;
  if (!defaultPostgresPromise) {
    defaultPostgresPromise = (async () => {
      try {
        const { getSql } = await import("./db.server.ts");
        const sql = await getSql();
        const store = createPostgresFeedbackRateLimitStore(sql, {
          onError: (err) => {
            console.error("[feedback-rate-limit] postgres consume failed:", err);
          },
        });
        defaultPostgresStore = store;
        return store;
      } catch (err) {
        console.error("[feedback-rate-limit] postgres store unavailable:", err);
        defaultPostgresPromise = null;
        return getMemoryFallback();
      }
    })();
  }
  return defaultPostgresPromise;
}
