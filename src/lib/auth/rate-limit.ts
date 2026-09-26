/**
 * Better Auth rate limits, stored in Postgres (`"rateLimit"`, migration 0010).
 *
 * The default storage is process memory. On Vercel each instance would keep
 * its own OTP / sign-in counters, so a burst across instances walks past the
 * cap. `storage: "database"` uses Better Auth's atomic `consume` against the
 * shared table. No Redis — the app already has Postgres.
 *
 * Windows are seconds. Paths match Better Auth's mounted routes.
 */
export const authRateLimit = {
  enabled: true,
  window: 60,
  max: 60,
  storage: "database" as const,
  customRules: {
    "/sign-in/email": { window: 60, max: 5 },
    "/sign-up/email": { window: 60, max: 3 },
    "/request-password-reset": { window: 60, max: 3 },
    "/forget-password": { window: 60, max: 3 },
    // One-time codes cost money to send and are worth brute-forcing, so the
    // send path is capped harder than the verify path.
    "/email-otp/send-verification-otp": { window: 60, max: 3 },
    "/sign-in/email-otp": { window: 60, max: 5 },
    "/sign-in/passkey": { window: 60, max: 10 },
    "/passkey/generate-authenticate-options": { window: 60, max: 10 },
    "/passkey/generate-register-options": { window: 60, max: 5 },
  },
};
