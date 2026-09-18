#!/usr/bin/env node
/**
 * Assert durable-session constants stay aligned (cookie Max-Age ↔ sticky TTL)
 * and remind operators that BETTER_AUTH_SECRET must be a stable env var.
 *
 * Kept as plain JS so `node scripts/check-auth-session.mjs` needs no TS loader.
 * Values must match `src/lib/auth/session-lifetime.ts`.
 */
import assert from "node:assert/strict";

/** Mirror of src/lib/auth/session-lifetime.ts — keep in sync. */
const SESSION_EXPIRES_IN_SEC = 60 * 60 * 24 * 30;
const SESSION_UPDATE_AGE_SEC = 60 * 60 * 24;
const STICKY_STORAGE_TTL_MS = SESSION_EXPIRES_IN_SEC * 1000;
const STICKY_EMPTY_GRACE_MS = 8_000;
const STICKY_REFETCH_OFFSETS_MS = [0, 1_500, 3_500, 5_500];

assert.equal(SESSION_EXPIRES_IN_SEC, 60 * 60 * 24 * 30, "session must be 30 days");
assert.equal(SESSION_UPDATE_AGE_SEC, 60 * 60 * 24, "updateAge must be 1 day");
assert.equal(
  STICKY_STORAGE_TTL_MS,
  SESSION_EXPIRES_IN_SEC * 1000,
  "sticky TTL must match session Max-Age",
);
assert.ok(STICKY_EMPTY_GRACE_MS >= 8_000, "cold-return grace must allow multi-retry");
assert.ok(STICKY_REFETCH_OFFSETS_MS.length >= 3, "need several refetches in the grace window");
for (const offset of STICKY_REFETCH_OFFSETS_MS) {
  assert.ok(offset < STICKY_EMPTY_GRACE_MS, "refetch offsets must fall inside the grace");
}

console.log(
  "[auth-session] ok — 30d cookie, sticky TTL aligned, multi-retry grace.",
);
console.log(
  "[auth-session] Deploy requires a stable BETTER_AUTH_SECRET (Production + Preview).",
);
console.log(
  "  Without it each serverless instance mints a random secret and sessions",
);
console.log("  look lost across cold starts in every browser.");
