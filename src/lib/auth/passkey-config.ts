/**
 * Passkey (WebAuthn) relying-party config for this app's Better Auth plugin.
 *
 * Independent of the Grok broker — passkeys are app-owned. `rpID` must be the
 * hostname the visitor is on (or a registrable parent). When the deployment has
 * a stable public URL we pin it; otherwise the plugin takes the per-request
 * baseURL hostname (local + preview).
 *
 * Registration defaults force platform (Face ID / Touch ID), not cross-platform
 * security keys / hybrid QR enrollment.
 */

export type PasskeyRpConfig = {
  rpName: string;
  rpID?: string;
  origin?: string | string[];
  authenticatorSelection: {
    authenticatorAttachment: "platform";
    residentKey: "preferred";
    userVerification: "required";
  };
};

const RP_NAME = "Trust Your Sign";

/** Server register defaults — Face ID / Touch ID only. */
export const PLATFORM_AUTHENTICATOR_SELECTION = {
  authenticatorAttachment: "platform",
  residentKey: "preferred",
  userVerification: "required",
} as const satisfies PasskeyRpConfig["authenticatorSelection"];

/**
 * Build passkey plugin options from the same origin Better Auth already uses.
 * `explicitBaseURL` is `BETTER_AUTH_URL` or the Vercel platform origin when set.
 */
export function passkeyRpConfig(explicitBaseURL: string | undefined): PasskeyRpConfig {
  const authenticatorSelection = { ...PLATFORM_AUTHENTICATOR_SELECTION };
  if (!explicitBaseURL) {
    return { rpName: RP_NAME, authenticatorSelection };
  }
  try {
    const url = new URL(explicitBaseURL);
    return {
      rpName: RP_NAME,
      rpID: url.hostname,
      origin: explicitBaseURL.replace(/\/+$/, ""),
      authenticatorSelection,
    };
  } catch {
    return { rpName: RP_NAME, authenticatorSelection };
  }
}

/**
 * Whether this host registers the passkey plugin and can finish a passkey
 * sign-in. True whenever auth is on — the plugin resolves rpID from the
 * request baseURL when no stable origin is injected.
 */
export function passkeyAvailable(authDisabled: boolean): boolean {
  return !authDisabled;
}
