import { useEffect, useState } from "react";
import type { SignId } from "@/lib/chart/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listCharts, type SavedChart } from "@/lib/charts";
import { useSessionStore } from "@/lib/chart/session";
import { canExploreSignStars, exploreLockReason } from "@/lib/galaxy/exploreAccess";
import { setExploreStarsUnlocked } from "@/lib/galaxy/travel";

/** Whether non-hub stars in this sign’s galaxy are unlocked for the viewer. */
export function useSignExploreAccess(signId: SignId | null) {
  const { user, isPending } = useCurrentUserState();
  const session = useSessionStore((s) => s.session);
  const [savedCharts, setSavedCharts] = useState<SavedChart[] | null>(null);
  // Real account only — not the unsigned guest. Dev fallback counts as signed in
  // when auth is disabled for local preview.
  const signedIn = Boolean(user);

  useEffect(() => {
    if (!user) {
      setSavedCharts(null);
      return;
    }
    let cancelled = false;
    listCharts()
      .then((rows) => {
        if (!cancelled) setSavedCharts(rows.filter((c) => c.relation === "self"));
      })
      .catch(() => {
        if (!cancelled) setSavedCharts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, session?.savedId]);

  const unlocked =
    !isPending &&
    signId != null &&
    canExploreSignStars({
      signId,
      session,
      savedCharts,
      signedIn,
    });

  const lockReason =
    isPending || signId == null
      ? ("auth" as const)
      : exploreLockReason({
          signId,
          session,
          savedCharts,
          signedIn,
        });

  useEffect(() => {
    setExploreStarsUnlocked(unlocked);
  }, [unlocked]);

  return { unlocked, lockReason, signedIn, isPending, savedCharts, session };
}
