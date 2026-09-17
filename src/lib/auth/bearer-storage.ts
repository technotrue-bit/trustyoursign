/**
 * Live-preview bearer token storage.
 *
 * Deployed hosts authenticate with the HttpOnly `__Host-` session cookie.
 * The Better Auth `bearer` plugin, when it sees `Authorization: Bearer …`,
 * *replaces* the request's session cookie with that token. A leftover token in
 * sessionStorage/localStorage (from an old preview bind, or written durably by
 * OwnerBind) therefore makes `/get-session` look up a dead session and return
 * null — which `/account` treats as signed out — while the real cookie is still
 * perfectly good. That reads as "sometimes signed out when I open Profile."
 *
 * Rule: only read/attach a bearer on `*.grok-sandbox.com`. Everywhere else,
 * purge any leftover keys so the cookie path cannot be shadowed.
 */

export const BEARER_KEY = "grok-auth.bearer-token";

export function isLivePreviewHost(hostname: string): boolean {
  return hostname.endsWith(".grok-sandbox.com");
}

function readItem(store: Storage | undefined, key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function removeItem(store: Storage | undefined, key: string): void {
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

function setItem(store: Storage | undefined, key: string, value: string): void {
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** Drop bearer leftovers from both storages (deployed + sign-out). */
export function clearBearerTokens(stores: {
  session?: Storage;
  local?: Storage;
}): void {
  removeItem(stores.session, BEARER_KEY);
  removeItem(stores.local, BEARER_KEY);
}

/**
 * Token to attach as `Authorization: Bearer`, or null.
 * Always null outside the live-preview host — even if storage still holds one.
 */
export function readBearerTokenForRequest(opts: {
  hostname: string;
  session?: Storage;
  local?: Storage;
}): string | null {
  if (!isLivePreviewHost(opts.hostname)) return null;
  return readItem(opts.session, BEARER_KEY) ?? readItem(opts.local, BEARER_KEY);
}

/**
 * On app load: restore session←local only in preview; purge everywhere else.
 * Returns whether a preview bearer is now in sessionStorage.
 */
export function syncBearerStorageOnLoad(opts: {
  hostname: string;
  session?: Storage;
  local?: Storage;
}): boolean {
  if (!isLivePreviewHost(opts.hostname)) {
    clearBearerTokens(opts);
    return false;
  }
  const session = readItem(opts.session, BEARER_KEY);
  const lasting = readItem(opts.local, BEARER_KEY);
  if (!session && lasting) {
    setItem(opts.session, BEARER_KEY, lasting);
    return true;
  }
  return Boolean(session);
}

/** Persist a freshly minted preview token (session + durable local). */
export function writePreviewBearerToken(
  token: string,
  stores: { session?: Storage; local?: Storage },
): void {
  setItem(stores.session, BEARER_KEY, token);
  setItem(stores.local, BEARER_KEY, token);
}

/** sessionStorage-only write used by popup sign-in; clear also drops local leftovers. */
export function writeSessionBearerToken(
  token: string | null,
  stores: { session?: Storage; local?: Storage },
): void {
  if (token) {
    setItem(stores.session, BEARER_KEY, token);
    return;
  }
  clearBearerTokens(stores);
}
