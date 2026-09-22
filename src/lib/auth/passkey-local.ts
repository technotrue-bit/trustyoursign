/**
 * Origin-scoped local evidence that this browser already has a usable
 * platform passkey for Trust Your Sign.
 *
 * Empty discoverable `get()` on iOS Safari opens the hybrid QR / security-key
 * sheet. We only call modal passkey sign-in when UVPA is available AND we have
 * credential IDs to put in `allowCredentials`.
 *
 * Safari sometimes clears / partitions localStorage while iCloud Keychain still
 * holds the passkey — so IDs are mirrored to a first-party cookie as well.
 * Autofill success alone is NOT enough to offer the modal button (that path
 * would still start a naked discoverable get).
 */

const CREDENTIAL_IDS_KEY = "tys.passkey.credentialIds";
const AUTOFILL_OK_KEY = "tys.passkey.autofillOk";
/** One year — Face ID enroll is sticky; IDs are picker hints, not secrets. */
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

function readJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function readFromLocalStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return readJsonArray(window.localStorage.getItem(CREDENTIAL_IDS_KEY));
  } catch {
    return [];
  }
}

function writeToLocalStorage(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    if (ids.length === 0) {
      window.localStorage.removeItem(CREDENTIAL_IDS_KEY);
    } else {
      window.localStorage.setItem(CREDENTIAL_IDS_KEY, JSON.stringify(ids));
    }
  } catch {
    /* storage unavailable — ignore */
  }
}

function readFromCookie(): string[] {
  if (typeof document === "undefined") return [];
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${CREDENTIAL_IDS_KEY}=`));
    if (!match) return [];
    const value = match.slice(CREDENTIAL_IDS_KEY.length + 1);
    return readJsonArray(decodeURIComponent(value));
  } catch {
    return [];
  }
}

function writeToCookie(ids: string[]): void {
  if (typeof document === "undefined") return;
  try {
    if (ids.length === 0) {
      document.cookie = `${CREDENTIAL_IDS_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
      return;
    }
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CREDENTIAL_IDS_KEY}=${encodeURIComponent(JSON.stringify(ids))}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
  } catch {
    /* cookie unavailable — ignore */
  }
}

function mergeUnique(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const id of list) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Credential IDs last used successfully on this origin.
 * Reads localStorage and the mirror cookie, then re-heals whichever side is empty.
 */
export function readLocalPasskeyCredentialIds(): string[] {
  const fromStorage = readFromLocalStorage();
  const fromCookie = readFromCookie();
  const merged = mergeUnique(fromStorage, fromCookie);
  if (merged.length === 0) return [];
  // Heal: if Safari dropped one store, rewrite both from the survivor.
  if (fromStorage.length === 0 || fromCookie.length === 0 || merged.length !== fromStorage.length) {
    writeToLocalStorage(merged);
    writeToCookie(merged);
  }
  return merged;
}

/** Remember credential ID(s) after a successful Face ID enroll, sign-in, or server recovery. */
export function rememberLocalPasskeyCredentialIds(ids: string | string[]): void {
  const next = Array.isArray(ids) ? ids : [ids];
  if (next.length === 0) return;
  const merged = mergeUnique(readLocalPasskeyCredentialIds(), next);
  writeToLocalStorage(merged);
  writeToCookie(merged);
}

/** Drop local IDs (e.g. Account listed zero passkeys for this user). */
export function clearLocalPasskeyCredentialIds(): void {
  writeToLocalStorage([]);
  writeToCookie([]);
}

/** True when we have at least one credential ID for allowCredentials. */
export function hasLocalPasskeyCredentialIds(): boolean {
  return readLocalPasskeyCredentialIds().length > 0;
}

/** Conditional autofill completed on this origin — keyboard Face ID path works. */
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
 * Evidence that the modal Face ID button is safe to offer — we must have IDs
 * for allowCredentials. Autofill-ok alone is insufficient (naked discoverable
 * get still opens Safari’s Scan QR sheet).
 */
export function hasUsableLocalPasskeyEvidence(): boolean {
  return hasLocalPasskeyCredentialIds();
}
