/**
 * Origin-scoped local evidence that this browser already has a usable
 * platform passkey for Trust Your Sign.
 *
 * Empty discoverable `get()` on iOS Safari opens the hybrid QR / security-key
 * sheet. We only call modal passkey sign-in when UVPA is available AND this
 * store has credential IDs (or a prior conditional-autofill success).
 */

const CREDENTIAL_IDS_KEY = "tys.passkey.credentialIds";
const AUTOFILL_OK_KEY = "tys.passkey.autofillOk";

function readJsonArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Credential IDs last used successfully on this origin. */
export function readLocalPasskeyCredentialIds(): string[] {
  return readJsonArray(CREDENTIAL_IDS_KEY);
}

/** Remember credential ID(s) after a successful Face ID enroll or sign-in. */
export function rememberLocalPasskeyCredentialIds(ids: string | string[]): void {
  const next = Array.isArray(ids) ? ids : [ids];
  if (next.length === 0) return;
  writeJsonArray(CREDENTIAL_IDS_KEY, [...readLocalPasskeyCredentialIds(), ...next]);
}

/** Conditional autofill completed on this origin — local credential path works. */
export function markLocalPasskeyAutofillOk(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTOFILL_OK_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasLocalPasskeyAutofillOk(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTOFILL_OK_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Evidence that a discoverable / allowCredentials get is safe to offer —
 * we have IDs to pass, or autofill already succeeded here.
 */
export function hasUsableLocalPasskeyEvidence(): boolean {
  return readLocalPasskeyCredentialIds().length > 0 || hasLocalPasskeyAutofillOk();
}
