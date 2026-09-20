import { useEffect, useState } from "react";

/**
 * Server-truth owner verdict, cached per signed-in user id.
 *
 * `isSiteOwner` (client) is cosmetic — it passes on an email match alone, while
 * the server gate (`assertSiteOwner`) needs an immutable identity. When the two
 * disagree, owner chrome renders and every owner-only fetch 404s, which reads as
 * "the button does nothing". Ask the server once and remember the answer.
 */

export type OwnerVerdict = boolean | null;

type Probe = () => Promise<{ owner: boolean }>;

const verdicts = new Map<string, OwnerVerdict>();
const inflight = new Map<string, Promise<OwnerVerdict>>();
const listeners = new Set<() => void>();

// Lazy so this cache stays importable without the server-fn runtime (tests).
const serverProbe: Probe = () => import("@/lib/site").then((m) => m.claimSite());
let probe: Probe = serverProbe;

function notify() {
  for (const l of listeners) l();
}

/** Cached verdict, `null` while unknown (not yet asked, or the probe failed). */
export function peekOwnerVerdict(userId: string | null | undefined): OwnerVerdict {
  if (!userId) return false;
  return verdicts.get(userId) ?? null;
}

/**
 * Resolve the owner verdict for `userId`. One request per user id per page
 * load; a failed probe is not cached, so the next call retries.
 */
export function resolveOwnerVerdict(userId: string | null | undefined): Promise<OwnerVerdict> {
  if (!userId) return Promise.resolve(false);
  const known = verdicts.get(userId);
  if (known !== undefined) return Promise.resolve(known);
  const pending = inflight.get(userId);
  if (pending) return pending;
  const p = probe()
    .then((r) => {
      const v = r.owner === true;
      verdicts.set(userId, v);
      return v as OwnerVerdict;
    })
    .catch(() => null as OwnerVerdict)
    .finally(() => {
      inflight.delete(userId);
      notify();
    });
  inflight.set(userId, p);
  return p;
}

/** Forget a verdict (sign-out, or after a server call proved it stale). */
export function forgetOwnerVerdict(userId?: string | null) {
  if (userId) verdicts.delete(userId);
  else verdicts.clear();
  notify();
}

/** Test seam: swap the server probe. Returns a restore function. */
export function setOwnerProbeForTests(next: Probe | null): () => void {
  const prev = probe;
  probe = next ?? serverProbe;
  verdicts.clear();
  inflight.clear();
  return () => {
    probe = prev;
    verdicts.clear();
    inflight.clear();
  };
}

/**
 * `true` when the server has confirmed this user is the owner, `false` when it
 * has said no (or there is no user), `null` while the answer is still pending.
 */
export function useOwnerVerdict(userId: string | null | undefined): OwnerVerdict {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    if (userId && verdicts.get(userId) === undefined) void resolveOwnerVerdict(userId);
    return () => {
      listeners.delete(l);
    };
  }, [userId]);
  return peekOwnerVerdict(userId);
}
