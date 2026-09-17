/**
 * WebAuthn client hints + allowCredentials merge for platform-preferring get.
 * Kept free of the auth client so unit tests can import without browser/DOM.
 */
import type {
  AuthenticatorTransportFuture,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

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

/**
 * Merge local credential IDs into allowCredentials so Safari is not handed an
 * empty discoverable get (which opens the hybrid QR sheet). Keeps hints.
 */
export function withPlatformAuthOptions(
  options: PublicKeyCredentialRequestOptionsJSON,
  localCredentialIds: readonly string[],
): PublicKeyCredentialRequestOptionsJSON {
  const hinted = withPlatformAuthHints(options);
  if (localCredentialIds.length === 0) return hinted;

  const existing = hinted.allowCredentials ?? [];
  const seen = new Set(existing.map((c) => c.id));
  const extras: NonNullable<PublicKeyCredentialRequestOptionsJSON["allowCredentials"]> = [];
  for (const id of localCredentialIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    extras.push({
      id,
      type: "public-key",
      transports: ["internal"] as AuthenticatorTransportFuture[],
    });
  }
  if (extras.length === 0) return hinted;
  return {
    ...hinted,
    allowCredentials: [...existing, ...extras],
  };
}

/** True when options already carry at least one allowCredentials entry. */
export function hasAllowCredentials(
  options: PublicKeyCredentialRequestOptionsJSON | null | undefined,
): boolean {
  return (options?.allowCredentials?.length ?? 0) > 0;
}

/**
 * Modal Face ID is only safe when the merged options include allowCredentials.
 * Hints alone still open iOS hybrid QR on an empty discoverable get.
 */
export function canSafelyStartPlatformPasskey(
  options: PublicKeyCredentialRequestOptionsJSON,
  localCredentialIds: readonly string[],
): boolean {
  return hasAllowCredentials(withPlatformAuthOptions(options, localCredentialIds));
}
