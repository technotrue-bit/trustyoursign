import type { SignId } from "@/lib/chart/types";
import { hasTimedNatal } from "@/lib/charts-saved";
import type { ChartSummary, SavedChart } from "@/lib/charts";
import type { ChartSession } from "@/lib/chart/session/types";

type ExplorableChart = SavedChart | ChartSummary;

/** Live session counts as a full chart when timed natal is present. */
export function sessionHasFullChart(session: ChartSession | null | undefined, signId?: SignId): boolean {
  if (!session || session.kind !== "visitor") return false;
  if (!session.nativity) return false;
  if (session.birth.hour == null || session.birth.minute == null) return false;
  if (!session.birth.place) return false;
  if (signId != null && session.signId !== signId) return false;
  return true;
}

/** Saved self chart with timed natal = durable profile for that sign. */
export function chartIsExplorableProfile(chart: ExplorableChart): boolean {
  return chart.relation === "self" && hasTimedNatal(chart);
}

export function savedUnlocksSign(charts: ExplorableChart[] | null | undefined, signId: SignId): boolean {
  if (!charts?.length) return false;
  return charts.some((c) => chartIsExplorableProfile(c) && c.signId === signId);
}

export function hasFullChartForSign(opts: {
  signId: SignId;
  session: ChartSession | null | undefined;
  savedCharts?: ExplorableChart[] | null;
}): boolean {
  if (sessionHasFullChart(opts.session, opts.signId)) return true;
  if (opts.session?.savedId && sessionHasFullChart(opts.session) && opts.session.signId === opts.signId) {
    return true;
  }
  return savedUnlocksSign(opts.savedCharts, opts.signId);
}

export type ExploreLockReason = "auth" | "chart" | null;

/**
 * @deprecated Sign galaxies are open to everyone. Kept so older call sites
 * that paint "preview" chrome stay green — always true.
 */
export const GUEST_PREVIEW_COUNT = Number.POSITIVE_INFINITY;

/** @deprecated Always true — lore is no longer gated by preview count. */
export function guestPreviewUnlocked(_pointIndex: number, _isHub = false): boolean {
  return true;
}

/**
 * Sign-galaxy lore is open for every viewer so they can learn the sign.
 * Auth + a kept chart still matter for *saving* a sky across devices, not for
 * reading stars here.
 */
export function canExploreSignStars(_opts: {
  signId: SignId;
  session: ChartSession | null | undefined;
  savedCharts?: ExplorableChart[] | null;
  signedIn: boolean;
}): boolean {
  return true;
}

/**
 * Always unlocked. `ExploreLockReason` stays for HUD typing; callers should
 * treat a non-null value as legacy-only.
 */
export function exploreLockReason(_opts: {
  signId: SignId;
  session: ChartSession | null | undefined;
  savedCharts?: ExplorableChart[] | null;
  signedIn: boolean;
  pointIndex?: number | null;
  isHub?: boolean;
}): ExploreLockReason {
  return null;
}
