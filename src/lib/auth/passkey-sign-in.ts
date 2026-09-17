/**
 * Platform-preferring passkey sign-in for the modal "Continue with passkey" button.
 *
 * Better Auth's stock `authClient.signIn.passkey({ autoFill: false })` calls
 * `startAuthentication` with server options only — no WebAuthn `hints`. On iOS
 * Safari a discoverable get with empty `allowCredentials` often opens the
 * hybrid "Scan QR Code" sheet instead of Face ID / Touch ID.
 *
 * This wrapper mirrors the Better Auth passkey client ceremony, then injects
 * `hints: ["client-device"]` and any locally remembered credential IDs so the
 * browser prefers the on-device authenticator. Callers MUST gate the button on
 * UVPA + local credential evidence — never start a naked discoverable get.
 *
 * Keep conditional autofill on the stock client:
 *   `authClient.signIn.passkey({ autoFill: true })`
 * — keyboard / saved-passkey Face ID already uses the local credential path.
 */
import {
  WebAuthnError,
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { authClient } from "./client";
import { withPlatformAuthOptions } from "./passkey-hints";
import { rememberLocalPasskeyCredentialIds, readLocalPasskeyCredentialIds } from "./passkey-local";

export {
  PLATFORM_AUTH_HINTS,
  withPlatformAuthHints,
  withPlatformAuthOptions,
} from "./passkey-hints";
export {
  hasUsableLocalPasskeyEvidence,
  markLocalPasskeyAutofillOk,
  readLocalPasskeyCredentialIds,
  rememberLocalPasskeyCredentialIds,
} from "./passkey-local";

export type PasskeyAuthError = {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
};

export type PasskeySignInResult = {
  data: unknown;
  error: PasskeyAuthError | null;
};

/** True when this device can verify the user with a platform authenticator. */
export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof PublicKeyCredential === "undefined") return false;
  const probe = PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
  if (typeof probe !== "function") return false;
  try {
    return await probe.call(PublicKeyCredential);
  } catch {
    return false;
  }
}

/**
 * Modal passkey sign-in: generate options → platform-hinted get → verify.
 * Same endpoints and response shape as Better Auth's passkey client.
 */
export async function signInWithPlatformPasskey(): Promise<PasskeySignInResult> {
  const options = await authClient.$fetch<PublicKeyCredentialRequestOptionsJSON>(
    "/passkey/generate-authenticate-options",
    { method: "GET" },
  );
  if (!options.data) {
    return {
      data: null,
      error:
        options.error ??
        ({
          message: "Could not start passkey sign-in",
          status: 400,
          statusText: "BAD_REQUEST",
        } satisfies PasskeyAuthError),
    };
  }

  let assertion: Awaited<ReturnType<typeof startAuthentication>>;
  try {
    assertion = await startAuthentication({
      optionsJSON: withPlatformAuthOptions(options.data, readLocalPasskeyCredentialIds()),
      useBrowserAutofill: false,
    });
  } catch (err) {
    return {
      data: null,
      error: {
        code: err instanceof WebAuthnError ? err.code : "AUTH_CANCELLED",
        message: err instanceof Error ? err.message : "Passkey sign-in cancelled",
        status: 400,
        statusText: "BAD_REQUEST",
      },
    };
  }

  // Match Better Auth's client: strip clientExtensionResults from the verify body.
  const { clientExtensionResults: _clientExtensionResults, ...responseBody } = assertion;
  const verified = await authClient.$fetch("/passkey/verify-authentication", {
    method: "POST",
    body: { response: responseBody },
  });
  if (!verified.error && assertion.id) {
    rememberLocalPasskeyCredentialIds(assertion.id);
  }
  return verified;
}
