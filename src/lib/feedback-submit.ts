/**
 * Feedback submit core — rate-limit, validate, send (or refuse clearly).
 *
 * Injectable deps so unit tests can cover validation + "email unconfigured →
 * error" without TanStack Start or a live Resend call.
 */

import { emailDeliveryConfigured, type EmailMessage } from "./email/send.server.ts";
import { buildFeedbackEmail, validateFeedback, type FeedbackRawInput } from "./feedback.ts";

export type FeedbackSubmitResult =
  | { ok: true }
  | { ok: false; error: string; status: 400 | 429 | 503 | 502 };

export type FeedbackSubmitDeps = {
  env?: Record<string, string | undefined>;
  /** Client key for rate limiting (IP or "anon"). */
  clientKey: string;
  now?: number;
  sendEmail?: (message: EmailMessage) => Promise<void>;
};

/** Soft ceiling: enough for real bugs, low enough to blunt casual spam. */
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Test helper — wipe in-memory buckets between cases. */
export function resetFeedbackRateLimit(): void {
  buckets.clear();
}

export function checkFeedbackRateLimit(clientKey: string, now = Date.now()): boolean {
  const key = clientKey.trim().slice(0, 120) || "anon";
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (existing.count >= RATE_MAX) return false;
  existing.count += 1;
  return true;
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
  if (!checkFeedbackRateLimit(deps.clientKey, now)) {
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
