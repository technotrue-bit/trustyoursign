import { useEffect, useState } from "react";
import type { SignId } from "@/lib/chart/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listChartSummaries, type ChartSummary } from "@/lib/charts";
import { useSessionStore } from "@/lib/chart/session";
import { canExploreSignStars, exploreLockReason, sessionHasFullChart } from "@/lib/galaxy/exploreAccess";
import { setExploreStarsUnlocked } from "@/lib/galaxy/travel";

/** Whether non-hub stars in this sign’s galaxy are unlocked for the viewer. */
export function useSignExploreAccess(signId: SignId | null) {
  const { user, isPending } = useCurrentUserState();
  const session = useSessionStore((s) => s.session);
  const [savedCharts, setSavedCharts] = useState<ChartSummary[] | null>(null);
  // Real account only — not the unsigned guest. Dev fallback counts as signed in
  // when auth is disabled for local preview.
  const signedIn = Boolean(user);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setSavedCharts(null);
      return;
    }
    let cancelled = false;
    listChartSummaries()
      .then((rows) => {
        if (!cancelled) setSavedCharts(rows.filter((c) => c.relation === "self"));
      })
      .catch(() => {
        if (!cancelled) setSavedCharts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // After upsert, patch the local summary list without refetching the vault.
  useEffect(() => {
    if (!userId || !session?.savedId) return;
    if (!sessionHasFullChart(session)) return;
    const savedId = session.savedId;
    setSavedCharts((prev) => {
      if (!prev) return prev;
      const existing = prev.find((c) => c.id === savedId);
      if (
        existing &&
        existing.hasTimedNatal &&
        existing.signId === session.signId &&
        existing.relation === session.relation
      ) {
        return prev;
      }
      const summary: ChartSummary = {
        id: savedId,
        label: session.label,
        relation: session.relation,
        personName: session.personName,
        signId: session.signId,
        birthMonth: session.birth.month,
        birthDay: session.birth.day,
        birthYear: session.birth.year,
        birthHour: session.birth.hour,
        birthMinute: session.birth.minute,
        birthPlace: session.birth.place,
        tone: session.tone,
        hasTimedNatal: true,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      return [summary, ...prev.filter((c) => c.id !== savedId)];
    });
  }, [
    userId,
    session?.savedId,
    session?.kind,
    session?.signId,
    session?.relation,
    session?.label,
    session?.personName,
    session?.tone,
    session?.birth.month,
    session?.birth.day,
    session?.birth.year,
    session?.birth.hour,
    session?.birth.minute,
    session?.birth.place,
    session?.nativity,
  ]);

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
