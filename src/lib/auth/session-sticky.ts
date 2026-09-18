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
 */

import type { AppUser } from "./use-current-user";

/** How long a warm identity survives one empty `/get-session` before we believe it. */
export const STICKY_EMPTY_GRACE_MS = 1500;

let held: AppUser | null = null;
let emptySince: number | null = null;

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
}

/** Test helper — reset module state between cases. */
export function resetStickySessionForTests(): void {
  clearStickySession();
}

/**
 * Fold a live Better Auth session read into what the UI should believe.
 * Pure aside from the module-level held identity (shared across every
 * `useCurrentUserState` subscriber so AccountMenu and /account agree).
 */
export function applySessionObservation(input: StickySessionObservation): StickySessionResult {
  const now = input.now ?? Date.now();

  if (input.liveUser) {
    held = input.liveUser;
    emptySince = null;
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
  // cannot flip the chrome to "Sign in" mid-click.
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
  }

  return {
    user: null,
    isPending: false,
    isReadFailed: false,
    shouldRefetch: false,
  };
}
