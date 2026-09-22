/**
 * Feedback submit core — rate-limit, validate, send (or refuse clearly).
 *
 * Injectable deps so unit tests can cover validation + "email unconfigured →
 * error" without TanStack Start or a live Resend / Postgres call.
 */

import { emailDeliveryConfigured, type EmailMessage } from "./email/send.server.ts";
import { buildFeedbackEmail, validateFeedback, type FeedbackRawInput } from "./feedback.ts";
import {
  createMemoryFeedbackRateLimitStore,
  getDefaultFeedbackRateLimitStore,
  resetFeedbackRateLimitStores,
  type FeedbackRateLimitStore,
} from "./feedback-rate-limit.ts";

export type FeedbackSubmitResult =
  | { ok: true }
  | { ok: false; error: string; status: 400 | 429 | 503 | 502 };

export type FeedbackSubmitDeps = {
  env?: Record<string, string | undefined>;
  /** Client key for rate limiting (IP or "anon"). */
  clientKey: string;
  now?: number;
  sendEmail?: (message: EmailMessage) => Promise<void>;
  /**
   * Injectable limiter (memory in unit tests). When omitted, uses durable
   * Postgres via `getDefaultFeedbackRateLimitStore()`.
   */
  rateLimitStore?: FeedbackRateLimitStore;
};

/** Soft ceiling: enough for real bugs, low enough to blunt casual spam. */
export { FEEDBACK_RATE_MAX, FEEDBACK_RATE_WINDOW_MS } from "./feedback-rate-limit.ts";

/** Module memory store for the sync helper (not the durable Postgres path). */
const syncMemoryStore = createMemoryFeedbackRateLimitStore();

/**
 * Test helper — wipe module rate-limit singletons (and memory fallback).
 * Prefer injecting `createMemoryFeedbackRateLimitStore()` in new tests.
 */
export function resetFeedbackRateLimit(): void {
  syncMemoryStore.reset?.();
  resetFeedbackRateLimitStores();
}

/**
 * Sync memory check for quick probes. Prefer injectable `rateLimitStore` on
 * `submitFeedback` (Postgres in production).
 */
export function checkFeedbackRateLimit(clientKey: string, now = Date.now()): boolean {
  return syncMemoryStore.consume(clientKey, now) === true;
}

/**
 * Validate + deliver one feedback message. Never pretends success when mail
 * is unconfigured or the provider rejects.
 */
export async function submitFeedback(
  raw: FeedbackRawInput,
  deps: FeedbackSubmitDeps,
): Promise<FeedbackSubmitResult> {
  const validated = validateFeedback(raw);
  if (!validated.ok) {
    return { ok: false, error: validated.error, status: validated.status };
  }

  const now = deps.now ?? Date.now();
  const store = deps.rateLimitStore ?? (await getDefaultFeedbackRateLimitStore());
  const allowed = await store.consume(deps.clientKey, now);
  if (!allowed) {
    return {
      ok: false,
      error: "Too many notes from this place — try again in a bit, or email directly.",
      status: 429,
    };
  }

  const env = deps.env ?? process.env;
  if (!emailDeliveryConfigured(env)) {
    return {
      ok: false,
      error:
        "Feedback email is not configured on this host (need RESEND_API_KEY and EMAIL_FROM). Use the mailto link instead.",
      status: 503,
    };
  }

  const message = buildFeedbackEmail(validated.value);
  const send =
    deps.sendEmail ??
    (async (msg: EmailMessage) => {
      const { sendEmail } = await import("./email/send.server.ts");
      await sendEmail(msg);
    });

  try {
    await send(message);
    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // Never echo provider internals at length to the visitor.
    const short = reason.slice(0, 160);
    return {
      ok: false,
      error: `Could not send feedback: ${short}`,
      status: 502,
    };
  }
}

/** Best-effort client IP from common proxy headers. */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "anon";
}
