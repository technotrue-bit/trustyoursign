/**
 * WebAuthn client hints that prefer the on-device authenticator.
 * Kept free of the auth client so unit tests can import without browser/DOM.
 */
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

/** Prefer the on-device authenticator (Face ID / Touch ID) over hybrid QR. */
export const PLATFORM_AUTH_HINTS = ["client-device"] as const;

/**
 * Merge server authentication options with a platform-preferring client hint.
 * Pure helper — unit-tested so the button path cannot silently drop hints.
 */
export function withPlatformAuthHints(
  options: PublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptionsJSON {
  return {
    ...options,
    hints: [...PLATFORM_AUTH_HINTS],
  };
}
