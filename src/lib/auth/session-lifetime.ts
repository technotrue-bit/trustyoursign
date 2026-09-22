/**
 * Durable session lifetime — single source for cookie Max-Age, DB expiresAt,
 * sticky localStorage TTL, and updateAge. Every browser that keeps first-party
 * cookies with Max-Age relies on these numbers matching.
 */

/** How long the HttpOnly `__Host-` session cookie + DB row stay valid (seconds). */
export const SESSION_EXPIRES_IN_SEC = 60 * 60 * 24 * 30;

/** Slide the session window forward when this much of expiresIn has elapsed (seconds). */
export const SESSION_UPDATE_AGE_SEC = 60 * 60 * 24;

/** Sticky localStorage bridge TTL — match the durable cookie so cold returns stay covered. */
export const STICKY_STORAGE_TTL_MS = SESSION_EXPIRES_IN_SEC * 1000;

/**
 * How long a warm / hydrated identity survives empty `/get-session` success
 * before we believe Sign in. Long enough for 3–4 mobile retries.
 */
export const STICKY_EMPTY_GRACE_MS = 8_000;

/** Backoff offsets (ms) for refetches while the empty grace is open. */
export const STICKY_REFETCH_OFFSETS_MS = [0, 1_500, 3_500, 5_500] as const;
