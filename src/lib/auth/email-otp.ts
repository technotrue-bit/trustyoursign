import { createServerFn } from "@tanstack/react-start";

/**
 * One-time-code sign-in — the availability probe, plus re-exports of the shared
 * constants (`./otp-code`) so callers have one import.
 *
 * The sign-in UI offers this path only when the host can actually deliver mail,
 * so nobody is shown a button that cannot complete. The answer comes from the
 * server's env (the single source of truth) rather than a mirrored `VITE_` flag,
 * which could drift out of sync with the delivery credentials.
 */

export {
  OTP_EXPIRES_SECONDS,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
  cooldownSecondsLeft,
  isCompleteOtp,
  normalizeOtpInput,
} from "./otp-code";

/** True when the host has email delivery configured. */
export const emailOtpAvailable = createServerFn({ method: "GET" }).handler(async () => {
  const { emailDeliveryConfigured } = await import("@/lib/email/send.server");
  return emailDeliveryConfigured();
});
