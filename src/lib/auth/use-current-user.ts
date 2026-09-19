import { useEffect, useRef, useState } from "react";
import { authClient, authEnabled } from "./client";
import { softRecoverSession } from "./session-recover";
import {
  STICKY_EMPTY_GRACE_MS,
  STICKY_REFETCH_OFFSETS_MS,
  applySessionObservation,
} from "./session-sticky";

/** Normalized user shape used across the app, auth on or off. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  /** True when this is the sandbox/dev fallback (auth not configured). */
  isDevFallback: boolean;
};

/**
 * Stable fallback user, used ONLY when auth is disabled
 * (`VITE_AUTH_ENABLED=false`, the shipped default). With auth on, the sandbox
 * live preview does real sign-in via the baked preview client. Its id is
 * `"dev-user"` — the SAME id `verify.server.ts` returns server-side — so per-user
 * rows written in that mode belong to one consistent owner.
 */
export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: "Dev User",
  primaryEmail: "dev@example.com",
  profileImageUrl: null,
  isDevFallback: true,
};

/** `useCurrentUserState()` result: the user plus the session-loading flag. */
export type CurrentUserState = {
  /** The user — `null` BOTH while the session loads and when signed out. */
  user: AppUser | null;
  /** True while the session is still resolving — don't treat `user: null` as signed out yet. */
  isPending: boolean;
  /**
   * The session READ failed — the request never got an answer (network drop,
   * server hiccup). NOT "signed out": the cookie may be perfectly good. A phone
   * waking from the app switcher fires exactly this request, so treating it as
   * signed out logs people out on resume. See `session-guard`.
   *
   * Also true briefly when `/get-session` returns empty after we already knew a
   * user — sticky session holds the identity so Profile clicks cannot bounce
   * you to sign-in over a transient miss (see `session-sticky`).
   */
  isReadFailed: boolean;
  /**
   * Re-read the session after a failed read. Wakes the auth server first, then
   * refetches with cookie-cache bypass — a bare `refetch()` is what made Try
   * Again look dead when the function was still cold.
   */
  refetchSession: () => void;
};

function mapUser(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}): AppUser {
  return {
    id: user.id,
    displayName: user.name ?? null,
    primaryEmail: user.email ?? null,
    profileImageUrl: user.image ?? null,
    isDevFallback: false,
  };
}

/**
 * Current user + loading state. Same behavior in live preview and when deployed:
 *   - Auth enabled -> the real signed-in user; `user` is `null` while
 *                            the session resolves (`isPending: true`) and when
 *                            signed out (`isPending: false`). Session comes from
 *                            Better Auth `useSession()` → `/api/auth/get-session`
 *                            (cookie when deployed; bearer in live preview).
 *   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
 *
 * Protect a route by waiting out `isPending` before acting on `user` —
 * redirecting on `user: null` alone bounces signed-in visitors to sign-in on
 * every hard reload:
 *
 *   import { RedirectToSignIn } from "@/lib/auth/gates";
 *   const { user, isPending } = useCurrentUserState();
 *   if (isPending) return null;              // still resolving — don't redirect yet
 *   if (!user) return <RedirectToSignIn />;  // definitely signed out
 *
 * `authEnabled` is a module-level constant fixed at load, so the guarded hook
 * call keeps a stable hook order across every render of a given component.
 */
export function useCurrentUserState(): CurrentUserState {
  if (!authEnabled) {
    return { user: DEV_USER, isPending: false, isReadFailed: false, refetchSession: () => {} };
  }
  const { data, isPending, isRefetching, error, refetch } = authClient.useSession();
  // `refetch` is a fresh identity on most renders. Hold it in a ref so the sticky
  // retry effect below cannot re-schedule itself every render — that turned the
  // intended four probes into dozens of `/get-session` calls and tripped the auth
  // rate limiter, after which Log out (and anything else needing a session read)
  // silently failed.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  // Tick so sticky empty grace can expire / re-resolve without another BA event.
  const [, setStickTick] = useState(0);

  const liveUser = data?.user ? mapUser(data.user) : null;
  // Better Auth only sets isPending on the first load (or when data is null).
  // A Try Again after an error sets isRefetching — treat that as pending so the
  // guard can leave the dead error screen.
  const resolved = applySessionObservation({
    liveUser,
    isPending: isPending || isRefetching,
    hasError: Boolean(error) && !isRefetching,
  });

  useEffect(() => {
    if (!resolved.shouldRefetch) return;
    const timers: number[] = [];
    for (const offset of STICKY_REFETCH_OFFSETS_MS) {
      timers.push(
        window.setTimeout(() => {
          // Soft atom retry — wake/reload is reserved for the explicit Try Again path.
          void refetchRef.current({ query: { disableCookieCache: true } });
          setStickTick((n) => n + 1);
        }, offset),
      );
    }
    // Final tick after the full grace so sticky can drop if still empty.
    timers.push(
      window.setTimeout(() => setStickTick((n) => n + 1), STICKY_EMPTY_GRACE_MS),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [resolved.shouldRefetch]);

  return {
    user: resolved.user,
    isPending: resolved.isPending,
    isReadFailed: resolved.isReadFailed,
    refetchSession: () => {
      void softRecoverSession({ refetch });
    },
  };
}

/**
 * Convenience view of `useCurrentUserState().user` for display (e.g.
 * `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
 * for redirects/guards use `useCurrentUserState()` and check `isPending`.
 */
export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
