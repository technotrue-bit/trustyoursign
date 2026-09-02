import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isSiteOwner } from "@/lib/owner";
import { bindOwnerPreview, claimSite, primeOwner } from "@/lib/site";

const BEARER = "grok-auth.bearer-token";

function readStore(which: Storage | undefined) {
  if (!which) return null;
  try {
    return which.getItem(BEARER);
  } catch {
    return null;
  }
}

function writeStore(token: string) {
  try {
    window.sessionStorage.setItem(BEARER, token);
    window.localStorage.setItem(BEARER, token);
  } catch {
    /* ignore */
  }
}

function restoreBearer() {
  if (typeof window === "undefined") return;
  const session = readStore(window.sessionStorage);
  const lasting = readStore(window.localStorage);
  if (!session && lasting) {
    try {
      window.sessionStorage.setItem(BEARER, lasting);
    } catch {
      /* ignore */
    }
  }
}

restoreBearer();

/** Keeps Devin's desk open in the live preview for this build session. */
export function OwnerBind() {
  const { user, isPending } = useCurrentUserState();
  const ran = useRef(false);

  useEffect(() => {
    if (isPending || ran.current) return;
    if (user) {
      ran.current = true;
      if (isSiteOwner(user)) void claimSite().catch(() => {});
      return;
    }
    ran.current = true;
    try {
      if (sessionStorage.getItem("grok-auth.skip-owner-bind") === "1") return;
    } catch {
      /* ignore */
    }
    void (async () => {
      restoreBearer();
      await primeOwner().catch(() => {});
      const next = await bindOwnerPreview().catch(() => ({ token: null }));
      if (!next.token) return;
      writeStore(next.token);
      try {
        await authClient.getSession();
      } catch {
        /* session hook will retry */
      }
      await claimSite().catch(() => {});
    })();
  }, [user, isPending]);

  return null;
}
