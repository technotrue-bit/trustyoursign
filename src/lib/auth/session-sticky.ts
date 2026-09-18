/**
 * Sticky session for the signed-in chrome.
 *
 * Better Auth's client replaces a warm session with `null` whenever
 * `/get-session` answers empty — even on a transient miss (leftover bearer
 * shadowing the cookie, a focus-refetch while Safari is mid-flight, a brief
 * cookie hiccup). Clicking Profile / My Chart / Subscription then looks like a
 * real sign-out: the menu flips to "Sign in" and `/account` bounces to login.
 *
 * Rule: once we have seen a user, a sudden empty success is treated as a failed
 * READ for a short grace (Reconnect UI), not as signed-out. Only a sustained
 * empty (or an explicit `clearStickySession` on Log out) drops them.
 *
 * Cold returns: in-memory `held` dies on every full reload, so a single empty
 * `/get-session` on first paint used to look like "signed out when I came back."
 * Mirror the last known identity into localStorage (short TTL) so a return visit
 * still gets the grace + refetch before we believe Sign in.
 */

import type { AppUser } from "./use-current-user";

/** How long a warm identity survives one empty `/get-session` before we believe it. */
export const STICKY_EMPTY_GRACE_MS = 3_000;

/** localStorage bridge so a full reload still has something to hold through grace. */
export const STICKY_STORAGE_KEY = "tys.auth.sticky-user";

/**
 * How long a stored identity may bridge cold loads. Kept under the durable
 * session cookie lifetime so we never outlive a real cookie by much.
 */
export const STICKY_STORAGE_TTL_MS = 60 * 60 * 24 * 7;

type StoredSticky = {
  user: AppUser;
  savedAt: number;
};

let held: AppUser | null = null;
let emptySince: number | null = null;
let storageHydrated = false;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredSticky(now: number): AppUser | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STICKY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSticky;
    if (!parsed?.user?.id || typeof parsed.savedAt !== "number") {
      store.removeItem(STICKY_STORAGE_KEY);
      return null;
    }
    if (now - parsed.savedAt > STICKY_STORAGE_TTL_MS) {
      store.removeItem(STICKY_STORAGE_KEY);
      return null;
    }
    // Never revive the auth-off sandbox user across reloads.
    if (parsed.user.isDevFallback) {
      store.removeItem(STICKY_STORAGE_KEY);
      return null;
    }
    return parsed.user;
  } catch {
    try {
      store.removeItem(STICKY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function writeStoredSticky(user: AppUser, now: number): void {
  if (user.isDevFallback) return;
  const store = storage();
  if (!store) return;
  try {
    const payload: StoredSticky = { user, savedAt: now };
    store.setItem(STICKY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

function clearStoredSticky(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STICKY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Restore held identity from localStorage once per page (cold return bridge). */
function hydrateFromStorage(now: number): void {
  if (storageHydrated) return;
  storageHydrated = true;
  if (held) return;
  const stored = readStoredSticky(now);
  if (stored) held = stored;
}

export type StickySessionObservation = {
  liveUser: AppUser | null;
  isPending: boolean;
  hasError: boolean;
  /** Injected in tests; defaults to `Date.now()`. */
  now?: number;
};

export type StickySessionResult = {
  user: AppUser | null;
  isPending: boolean;
  isReadFailed: boolean;
  /** True while holding through an empty success — caller should re-check once. */
  shouldRefetch: boolean;
};

/** Drop held identity (call from Log out so sticky cannot resurrect it). */
export function clearStickySession(): void {
  held = null;
  emptySince = null;
  clearStoredSticky();
}

/** Test helper — reset module state between cases. */
export function resetStickySessionForTests(): void {
  held = null;
  emptySince = null;
  storageHydrated = false;
  clearStoredSticky();
}

/**
 * Fold a live Better Auth session read into what the UI should believe.
 * Pure aside from the module-level held identity (shared across every
 * `useCurrentUserState` subscriber so AccountMenu and /account agree).
 */
export function applySessionObservation(input: StickySessionObservation): StickySessionResult {
  const now = input.now ?? Date.now();
  hydrateFromStorage(now);

  if (input.liveUser) {
    held = input.liveUser;
    emptySince = null;
    writeStoredSticky(input.liveUser, now);
    return {
      user: input.liveUser,
      isPending: false,
      isReadFailed: false,
      shouldRefetch: false,
    };
  }

  if (input.isPending) {
    return {
      user: held,
      // Still loading on first paint with no prior identity — keep chrome pending.
      isPending: held == null,
      isReadFailed: false,
      shouldRefetch: false,
    };
  }

  if (input.hasError) {
    // Network / 429 / server hiccup — cookie may still be good.
    return {
      user: held,
      isPending: false,
      isReadFailed: true,
      shouldRefetch: false,
    };
  }

  // Successful empty read. Hold a known identity briefly so a transient miss
  // cannot flip the chrome to "Sign in" mid-click / on cold return.
  if (held) {
    if (emptySince == null) emptySince = now;
    if (now - emptySince < STICKY_EMPTY_GRACE_MS) {
      return {
        user: held,
        isPending: false,
        isReadFailed: true,
        shouldRefetch: true,
      };
    }
    held = null;
    emptySince = null;
    clearStoredSticky();
  }

  return {
    user: null,
    isPending: false,
    isReadFailed: false,
    shouldRefetch: false,
  };
}
