/**
 * One-time-code constants and pure validation — no framework imports, so the
 * server (`auth/server.ts`) can share these with the sign-in UI without pulling
 * a client facade into its module graph, and they can be unit tested directly.
 */

/** Digits in a code. Must match the server plugin's `otpLength`. */
export const OTP_LENGTH = 6;

/** How long a code stays valid, in seconds. Must match the plugin's `expiresIn`. */
export const OTP_EXPIRES_SECONDS = 300;

/** Client-side cooldown before "send another code" re-enables. */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

/** Digits only, exactly `OTP_LENGTH` of them. Gates the verify button. */
export function isCompleteOtp(value: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value.trim());
}

/** Strip anything that is not a digit and cap at the code length. */
export function normalizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

/** Seconds remaining on the resend cooldown, floored at 0. */
export function cooldownSecondsLeft(cooldownUntil: number, now: number): number {
  return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
}
