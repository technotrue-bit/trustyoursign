import { useEffect, useState } from "react";
import type { SignId } from "@/lib/chart/types";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { listCharts, type SavedChart } from "@/lib/charts";
import { useSessionStore } from "@/lib/chart/session";
import { canExploreSignStars } from "@/lib/galaxy/exploreAccess";
import { setExploreStarsUnlocked } from "@/lib/galaxy/travel";

/** Whether non-hub stars in this sign’s galaxy are unlocked for the viewer. */
export function useSignExploreAccess(signId: SignId | null) {
  const user = useCurrentUser();
  const session = useSessionStore((s) => s.session);
  const [savedCharts, setSavedCharts] = useState<SavedChart[] | null>(null);

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
    signId != null &&
    canExploreSignStars({
      signId,
      session,
      savedCharts,
    });

  useEffect(() => {
    setExploreStarsUnlocked(unlocked);
  }, [unlocked]);

  return { unlocked, savedCharts, session };
}
