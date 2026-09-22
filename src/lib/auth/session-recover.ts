/**
 * Recover from a failed session READ ("Couldn't check your sign-in").
 *
 * Soft Better Auth `refetch()` alone often looks like a dead Try Again button:
 * a cold serverless function or sleeping Neon times out again, and the same
 * error screen stays up with no visible change. Wake the auth endpoint first
 * (fresh server/DB contact), then either soft-refetch or hard-reload.
 */

export const SESSION_WAKE_PATH = "/api/auth/get-session";

/** How long we wait for the wake probe before moving on. */
export const SESSION_WAKE_TIMEOUT_MS = 12_000;

export type WakeAuthServerOptions = {
  /** Injected for tests. Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Hit `/get-session` with cache disabled so a cold deploy / sleeping DB is
 * forced awake before the session atom retries. Errors are swallowed — the
 * follow-up refetch or reload is what updates UI state.
 */
export async function wakeAuthServer(opts: WakeAuthServerOptions = {}): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (!fetchImpl) return;
  const timeoutMs = opts.timeoutMs ?? SESSION_WAKE_TIMEOUT_MS;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer =
    ctrl && typeof setTimeout === "function"
      ? setTimeout(() => ctrl.abort(), timeoutMs)
      : null;
  try {
    await fetchImpl(SESSION_WAKE_PATH, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: ctrl?.signal,
    });
  } catch {
    /* wake is best-effort — refetch / reload still run */
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type SoftSessionRecoverOptions = {
  /** Soft session re-read (Better Auth `useSession().refetch`). */
  refetch: (queryParams?: {
    query?: { disableCookieCache?: boolean; disableRefresh?: boolean };
  }) => void | Promise<unknown>;
  fetchImpl?: typeof fetch;
};

/** Wake the auth server, then force a cookie-cache-bypassing session re-read. */
export async function softRecoverSession(opts: SoftSessionRecoverOptions): Promise<void> {
  await wakeAuthServer({ fetchImpl: opts.fetchImpl });
  try {
    await opts.refetch({ query: { disableCookieCache: true } });
  } catch {
    /* refetch errors surface via the session atom */
  }
}

export type HardSessionRecoverOptions = {
  fetchImpl?: typeof fetch;
  /** Injected for tests. Defaults to `window.location.reload`. */
  reload?: () => void;
};

/**
 * Wake the auth server, then hard-reload the page. Use for the Try Again
 * button: soft refetch can leave the atom stuck on the same failed read with
 * no UI change; a reload re-bootstraps against the newly woken instance.
 */
export async function hardRecoverSession(opts: HardSessionRecoverOptions = {}): Promise<void> {
  await wakeAuthServer({ fetchImpl: opts.fetchImpl });
  const reload =
    opts.reload ??
    (() => {
      if (typeof window !== "undefined") window.location.reload();
    });
  reload();
}
