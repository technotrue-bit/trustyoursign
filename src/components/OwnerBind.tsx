import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import {
  isLivePreviewHost,
  syncBearerStorageOnLoad,
  writePreviewBearerToken,
} from "@/lib/auth/bearer-storage";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isSiteOwner } from "@/lib/owner";
import { bindOwnerPreview, claimSite } from "@/lib/site";

function previewWindow() {
  if (typeof window === "undefined") return null;
  if (!isLivePreviewHost(window.location.hostname)) return null;
  return window;
}

// Deployed: purge any leftover preview bearer so it cannot shadow the cookie.
// Preview: restore session←local so a refreshed iframe keeps the desk open.
if (typeof window !== "undefined") {
  syncBearerStorageOnLoad({
    hostname: window.location.hostname,
    session: window.sessionStorage,
    local: window.localStorage,
  });
}

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

    // Deployed cookie auth: never mint or restore a bearer. A leftover token
    // attached as Authorization replaces the real session cookie inside Better
    // Auth's bearer plugin and makes /account look signed out.
    const win = previewWindow();
    if (!win) {
      ran.current = true;
      return;
    }

    ran.current = true;
    try {
      if (win.sessionStorage.getItem("grok-auth.skip-owner-bind") === "1") return;
    } catch {
      /* ignore */
    }
    void (async () => {
      syncBearerStorageOnLoad({
        hostname: win.location.hostname,
        session: win.sessionStorage,
        local: win.localStorage,
      });
      const next = await bindOwnerPreview().catch(() => ({ token: null as string | null }));
      if (!next.token) return;
      writePreviewBearerToken(next.token, {
        session: win.sessionStorage,
        local: win.localStorage,
      });
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
