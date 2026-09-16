import { createServerFn } from "@tanstack/react-start";
import { servedProviderIds } from "./providers";

/**
 * Sign-in availability — which of the page's options this host can actually
 * serve — plus re-exports of the shared constants (`./otp-code`,
 * `./sign-in-link`) so callers have one import.
 *
 * The sign-in UI offers an option only when the host can finish it: the email
 * code path needs mail delivery, and the Google/X buttons need the broker's
 * OAuth plugin (see `providers` below). The answer comes from the server's env
 * (the single source of truth) rather than a mirrored `VITE_` flag, which could
 * drift out of sync with the credentials that decide what is registered.
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

/**
 * What the sign-in UI needs to know about this host: which of its options the
 * server can actually serve. One shape, one call — every option on the page is
 * gated on this answer, so nothing is ever offered that cannot finish.
 */
export type SignInAvailability = {
  /** Mail delivery is configured at all (codes, and the link that rides with them). */
  codeAvailable: boolean;
  /**
   * Configured, but the sender is a provider SANDBOX domain, so delivery only
   * reaches the provider account's own address. The UI must say so rather than
   * promise a visitor a code the provider is going to refuse.
   */
  codeSandbox: boolean;
  /**
   * The provider ids the server can actually start (see `servedProviderIds`).
   * Empty when the broker client is not configured — better-auth then registers
   * no `/sign-in/oauth2` route, so a "Continue with …" button could only 404
   * after clearing the visitor's session. The sign-in page renders its provider
   * buttons from THIS list, never from the static provider table.
   */
  providers: string[];
};

/**
 * Whether this host can deliver a code, and which upstream providers it can
 * start. The answer comes from the server's env (the single source of truth)
 * rather than a mirrored `VITE_` flag, which could drift out of sync with the
 * credentials that decide what Better Auth actually registers.
 */
export const signInAvailability = createServerFn({ method: "GET" }).handler(
  async (): Promise<SignInAvailability> => {
    const { emailDeliveryConfigured, emailSenderIsSandbox } =
      await import("@/lib/email/send.server");
    // `authConfigured` is the flag that adds the broker's OAuth plugin to the
    // Better Auth instance (and with it `/sign-in/oauth2`) — see server.ts.
    const { authConfigured } = await import("@/lib/auth/server");
    const available = emailDeliveryConfigured();
    return {
      codeAvailable: available,
      codeSandbox: available && emailSenderIsSandbox(),
      providers: servedProviderIds(authConfigured),
    };
  },
);
