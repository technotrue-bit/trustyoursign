import type { SignId } from "@/lib/chart/types";
import { hasTimedNatal } from "@/lib/charts-saved";
import type { SavedChart } from "@/lib/charts";
import type { ChartSession } from "@/lib/chart/session/types";

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
export function chartIsExplorableProfile(chart: SavedChart): boolean {
  return chart.relation === "self" && hasTimedNatal(chart);
}

export function savedUnlocksSign(charts: SavedChart[] | null | undefined, signId: SignId): boolean {
  if (!charts?.length) return false;
  return charts.some((c) => chartIsExplorableProfile(c) && c.signId === signId);
}

export function hasFullChartForSign(opts: {
  signId: SignId;
  session: ChartSession | null | undefined;
  savedCharts?: SavedChart[] | null;
}): boolean {
  if (sessionHasFullChart(opts.session, opts.signId)) return true;
  if (opts.session?.savedId && sessionHasFullChart(opts.session) && opts.session.signId === opts.signId) {
    return true;
  }
  return savedUnlocksSign(opts.savedCharts, opts.signId);
}

export type ExploreLockReason = "auth" | "chart" | null;

/**
 * Stars beyond the hub unlock only when the viewer is signed in (or signed up)
 * and has a full timed natal / saved self profile for this sign.
 */
export function canExploreSignStars(opts: {
  signId: SignId;
  session: ChartSession | null | undefined;
  savedCharts?: SavedChart[] | null;
  /** True when the viewer has a real signed-in / signed-up session. */
  signedIn: boolean;
}): boolean {
  return exploreLockReason(opts) == null;
}

export function exploreLockReason(opts: {
  signId: SignId;
  session: ChartSession | null | undefined;
  savedCharts?: SavedChart[] | null;
  signedIn: boolean;
}): ExploreLockReason {
  if (!opts.signedIn) return "auth";
  if (!hasFullChartForSign(opts)) return "chart";
  return null;
}
