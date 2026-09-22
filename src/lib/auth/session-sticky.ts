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
 * Mirror the last known identity into localStorage (TTL = durable session) so a
 * return visit still gets multi-retry grace before we believe Sign in.
 */

import type { AppUser } from "./use-current-user";
import {
  STICKY_EMPTY_GRACE_MS,
  STICKY_STORAGE_TTL_MS,
} from "./session-lifetime.ts";

export {
  STICKY_EMPTY_GRACE_MS,
  STICKY_REFETCH_OFFSETS_MS,
  STICKY_STORAGE_TTL_MS,
} from "./session-lifetime.ts";

/** localStorage bridge so a full reload still has something to hold through grace. */
export const STICKY_STORAGE_KEY = "tys.auth.sticky-user";

type StoredSticky = {
  user: AppUser;
  savedAt: number;
};

let held: AppUser | null = null;
let emptySince: number | null = null;
let storageHydrated = false;
/**
 * Set by an explicit Log out for the rest of this page's life. Sign-out hard
 * reloads, so the latch dies with the page — but until then it stops a stale
 * in-memory session echo from re-populating `held` (see `applySessionObservation`).
 */
let explicitSignOut = false;

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
  /** True while holding through an empty success — caller should re-check. */
  shouldRefetch: boolean;
};

/** Drop held identity (call from Log out so sticky cannot resurrect it). */
export function clearStickySession(): void {
  held = null;
  emptySince = null;
  clearStoredSticky();
  explicitSignOut = true;
}

/** Test helper — reset module state between cases. */
export function resetStickySessionForTests(): void {
  held = null;
  emptySince = null;
  storageHydrated = false;
  explicitSignOut = false;
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

  // After an explicit Log out, never hold or revive an identity again on this
  // page. Better Auth's cached `data.user` outlives the sign-out call for a
  // render or two, and without this latch it re-populated `held` straight after
  // `clearStickySession()` — leaving the chrome signed in against a dead session
  // while the sticky retry window restarted on every render (an avalanche of
  // `/get-session` reads that trips the auth rate limiter, after which every
  // session-dependent control, Log out included, looks dead).
  if (explicitSignOut) {
    return { user: null, isPending: false, isReadFailed: false, shouldRefetch: false };
  }

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
    // Network / 429 / server hiccup — cookie may still be good. Do not flip
    // shouldRefetch here: pairing that with isRefetching→pending would restart
    // the sticky timer effect in a tight loop. SessionUnavailable wakes the
    // server and soft-retries on mount; Try Again hard-reloads.
    return {
      user: held,
      isPending: false,
      isReadFailed: true,
      shouldRefetch: false,
    };
  }

  // Successful empty read. Hold a known identity through the retry window so a
  // transient miss cannot flip the chrome to "Sign in" on cold return.
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

/**
 * One sticky refetch window per empty streak, shared by every
 * `useCurrentUserState()` subscriber. Each subscriber used to schedule its own
 * timers, and a sky error that remounted the tree stacked another window on
 * top until `/get-session` returned 429.
 */
export function createStickyRefetchGate() {
  let armed = false;
  return {
    /** True only for the caller that should start the timer window. */
    claim(shouldRefetch: boolean, settledUser: boolean): boolean {
      if (settledUser) {
        armed = false;
        return false;
      }
      if (!shouldRefetch || armed) return false;
      armed = true;
      return true;
    },
  };
}

export const stickyRefetchGate = createStickyRefetchGate();
