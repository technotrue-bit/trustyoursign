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
 * How many star points a guest (unsigned visitor) may open with real copy.
 * The hub is always open on top of these.
 */
export const GUEST_PREVIEW_COUNT = 3;

/**
 * Guests get the hub plus the first few stars as a taste of the galaxy.
 * Everything deeper stays behind the auth gate.
 */
export function guestPreviewUnlocked(pointIndex: number, isHub = false): boolean {
  if (isHub) return true;
  if (!Number.isFinite(pointIndex)) return false;
  const i = Math.trunc(pointIndex);
  return i >= 0 && i < GUEST_PREVIEW_COUNT;
}

/**
 * Stars beyond the hub unlock only when the viewer is signed in (or signed up)
 * and has a full timed natal / saved self profile for this sign.
 * Guests still see the hub and the first GUEST_PREVIEW_COUNT points.
 */
export function canExploreSignStars(opts: {
  signId: SignId;
  session: ChartSession | null | undefined;
  savedCharts?: ExplorableChart[] | null;
  /** True when the viewer has a real signed-in / signed-up session. */
  signedIn: boolean;
}): boolean {
  return exploreLockReason(opts) == null;
}

export function exploreLockReason(opts: {
  signId: SignId;
  session: ChartSession | null | undefined;
  savedCharts?: ExplorableChart[] | null;
  signedIn: boolean;
  /**
   * Point context for the star being viewed. When supplied, a guest keeps the
   * hub and the first GUEST_PREVIEW_COUNT points open; the rest return "auth".
   * Omit it to ask the sign-level question (does this viewer have the whole galaxy?).
   */
  pointIndex?: number | null;
  isHub?: boolean;
}): ExploreLockReason {
  const hub = opts.isHub ?? false;
  const hasPointContext = opts.pointIndex != null || hub;
  if (!opts.signedIn) {
    if (!hasPointContext) return "auth";
    return guestPreviewUnlocked(opts.pointIndex ?? Number.POSITIVE_INFINITY, hub) ? null : "auth";
  }
  if (!hasFullChartForSign(opts)) return "chart";
  return null;
}
