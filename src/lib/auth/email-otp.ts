import { createServerFn } from "@tanstack/react-start";

/**
 * One-time-code sign-in — the availability probe, plus re-exports of the shared
 * constants (`./otp-code`, `./sign-in-link`) so callers have one import.
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

export { SIGN_IN_LINK_CALLBACK_PATH, SIGN_IN_LINK_EXPIRES_SECONDS } from "./sign-in-link";

/** What the sign-in UI needs to know about the code path on this host. */
export type EmailOtpStatus = {
  /** Mail delivery is configured at all. */
  available: boolean;
  /**
   * Configured, but the sender is a provider SANDBOX domain, so delivery only
   * reaches the provider account's own address. The UI must say so rather than
   * promise a visitor a code the provider is going to refuse.
   */
  sandbox: boolean;
};

/** Whether this host can deliver a code, and whether it can deliver it to anyone. */
export const emailOtpStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<EmailOtpStatus> => {
    const { emailDeliveryConfigured, emailSenderIsSandbox } =
      await import("@/lib/email/send.server");
    const available = emailDeliveryConfigured();
    return { available, sandbox: available && emailSenderIsSandbox() };
  },
);
