/**
 * Pure frame-budget policy for the sky canvas.
 * Demand mode when Pause + idle; half-rate on 120Hz panels that are missing vsync.
 */

export type FrameGovernorMode = "always" | "demand";

export type FrameGovernorInput = {
  paused: boolean;
  handsOn: boolean;
  traveling: boolean;
  seeking: boolean;
  introPlaying: boolean;
  documentHidden: boolean;
  /** Recent rAF intervals in ms, oldest → newest. */
  intervalsMs: readonly number[];
};

export type FrameGovernorDecision = {
  mode: FrameGovernorMode;
  /** 1 = every rAF, 2 = every other rAF (120Hz panels under load). */
  renderEveryNth: 1 | 2;
  highRefresh: boolean;
  missRatio: number;
};

/** Median below this ⇒ treat the panel as 120Hz-class. */
export const HIGH_REFRESH_MEDIAN_MS = 10;
/** Share of intervals that may miss vsync before we half-rate. */
export const MISS_RATIO_ENTER = 0.1;
/** Miss ratio must fall below this to leave half-rate (hysteresis). */
export const MISS_RATIO_EXIT = 0.05;
/** How long intervals we consider when scoring misses. */
export const SAMPLE_WINDOW_MS = 2000;
/** Stay in half-rate at least this long once entered. */
export const HALF_RATE_MIN_MS = 1500;
/** Interval is a miss when it exceeds target × this. */
export const MISS_SLACK = 1.35;

export function medianSorted(sorted: readonly number[]): number {
  if (sorted.length === 0) return 16.7;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 16.7;
  return medianSorted([...values].sort((a, b) => a - b));
}

/** Keep only the intervals that fit inside the trailing sample window. */
export function windowIntervals(
  intervalsMs: readonly number[],
  windowMs = SAMPLE_WINDOW_MS,
): number[] {
  if (intervalsMs.length === 0) return [];
  const out: number[] = [];
  let sum = 0;
  for (let i = intervalsMs.length - 1; i >= 0; i--) {
    const v = intervalsMs[i]!;
    if (!(v > 0) || !Number.isFinite(v)) continue;
    out.push(v);
    sum += v;
    if (sum >= windowMs) break;
  }
  out.reverse();
  return out;
}

export function missRatioAgainst(
  intervalsMs: readonly number[],
  targetMs: number,
  slack = MISS_SLACK,
): number {
  if (intervalsMs.length === 0 || !(targetMs > 0)) return 0;
  const lim = targetMs * slack;
  let bad = 0;
  for (const v of intervalsMs) if (v > lim) bad++;
  return bad / intervalsMs.length;
}

export type HalfRateState = {
  active: boolean;
  sinceMs: number;
};

/**
 * Decide render mode + cadence. Pure — callers feed travel flags and a
 * rolling interval sample; the half-rate latch is threaded through `prev`.
 */
export function decideFrameGovernor(
  input: FrameGovernorInput,
  prev: HalfRateState = { active: false, sinceMs: 0 },
  nowMs = 0,
): FrameGovernorDecision & { halfRate: HalfRateState } {
  if (input.documentHidden) {
    return {
      mode: "demand",
      renderEveryNth: 1,
      highRefresh: false,
      missRatio: 0,
      halfRate: { active: false, sinceMs: 0 },
    };
  }

  const demand =
    input.paused &&
    !input.handsOn &&
    !input.traveling &&
    !input.seeking &&
    !input.introPlaying;

  const recent = windowIntervals(input.intervalsMs);
  const med = median(recent);
  const highRefresh = med > 0 && med < HIGH_REFRESH_MEDIAN_MS;
  const targetMs = highRefresh ? 1000 / 120 : 1000 / 60;
  const miss = missRatioAgainst(recent, targetMs);

  let half = prev;
  if (highRefresh && miss > MISS_RATIO_ENTER) {
    half = { active: true, sinceMs: prev.active ? prev.sinceMs : nowMs };
  } else if (!highRefresh) {
    half = { active: false, sinceMs: 0 };
  } else if (
    prev.active &&
    miss < MISS_RATIO_EXIT &&
    nowMs - prev.sinceMs >= HALF_RATE_MIN_MS
  ) {
    half = { active: false, sinceMs: 0 };
  } else if (prev.active) {
    half = prev;
  }

  return {
    mode: demand ? "demand" : "always",
    renderEveryNth: half.active ? 2 : 1,
    highRefresh,
    missRatio: miss,
    halfRate: half,
  };
}

/** Should demand-mode fire a redraw for this interaction? */
export function demandShouldInvalidate(mode: FrameGovernorMode): boolean {
  return mode === "demand";
}
