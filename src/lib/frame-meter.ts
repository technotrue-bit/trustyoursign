/**
 * Opt-in on-screen frame meter (`?fps=1`), for measuring the sky on a real
 * phone where devtools aren't handy. The overlay samples rAF intervals; the
 * sky's FrameGovernor bumps `noteSkyDraw` each time it actually renders, so
 * the meter can tell display rate from draw rate during half-rate stretches.
 */

/** A frame over this is slow: 1.5× the 60Hz budget. */
export const SLOW_FRAME_MS = 25;

export type FrameSummary = {
  fps: number;
  p95Ms: number;
  /** Percent of frames over SLOW_FRAME_MS. */
  slowPct: number;
  drawsPerSec: number;
};

export function summarizeFrames(intervalsMs: readonly number[], draws: number): FrameSummary {
  if (intervalsMs.length === 0) return { fps: 0, p95Ms: 0, slowPct: 0, drawsPerSec: 0 };
  const total = intervalsMs.reduce((a, b) => a + b, 0);
  const sorted = [...intervalsMs].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
  const slow = intervalsMs.filter((ms) => ms > SLOW_FRAME_MS).length;
  const seconds = total / 1000;
  return {
    fps: Math.round(intervalsMs.length / seconds),
    p95Ms: p95,
    slowPct: Math.round((slow / intervalsMs.length) * 100),
    drawsPerSec: Math.round(draws / seconds),
  };
}

export function frameMeterEnabled(search: string): boolean {
  return new URLSearchParams(search).get("fps") === "1";
}

let skyDraws = 0;

/** Called by FrameGovernor after each `gl.render`. */
export function noteSkyDraw(): void {
  skyDraws += 1;
}

/** Draws since the last call. */
export function takeSkyDraws(): number {
  const n = skyDraws;
  skyDraws = 0;
  return n;
}
