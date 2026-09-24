import type { SignId } from "@/lib/chart/types";
import {
  figureMatchTransform,
  galaxyFigureBox,
  paintedFigureBox,
  PLATE_OFFSET_Y,
  type FigureMatch,
} from "./signAlign";
import { plateHubUv } from "./signBurst";
import { PLATE_WIDE } from "./temple";
import type { ExplorePhase, SignGalaxy, SignTravelPoint } from "./signGalaxy";
import { getSignVolume, type SignVolume } from "./signVolume";

/** Measured from `public/signs/capricorn.png` (900×505) — plate UV, v = 1 at top. */
export const CAPRICORN_PLATE_ASPECT = 900 / 505;

/**
 * Lesson points traced onto painted stars (annotated plate). Index matches
 * `getSignGalaxy("capricorn").points` order (hub first, then existing lesson order).
 */
export const CAPRICORN_PLATE_LESSON_UV: ReadonlyArray<{ u: number; v: number }> = [
  { u: 0.5167, v: 0.5426 }, // chest swirl — hub / camera POV
  { u: 0.4033, v: 0.6376 },
  { u: 0.3644, v: 0.6653 },
  { u: 0.4656, v: 0.596 },
  { u: 0.5767, v: 0.5188 },
  { u: 0.6467, v: 0.5465 },
  { u: 0.7011, v: 0.3525 },
  { u: 0.3511, v: 0.5287 },
  { u: 0.7156, v: 0.2535 },
  { u: 0.6956, v: 0.2119 },
];

/** Match measured from capricorn art (72×42 alpha grid) when runtime volume is not ready. */
export const CAPRICORN_FALLBACK_MATCH: FigureMatch = {
  sx: 0.5992332931133592,
  sy: 0.5822631361674659,
  ox: -0.23239436619718362,
  oy: -0.175813008130081,
};

/** Inside hub core: small jewel in the swirl, not a full-frame flare. */
export const CAPRICORN_INSIDE_CORE_SCALE = 0.48;

export function capricornInsideKeepsPlate(signId: SignId, phase: ExplorePhase): boolean {
  return signId === "capricorn" && phase === "inside";
}

export function capricornSkipsEnterDissolve(signId: SignId): boolean {
  return signId === "capricorn";
}

export function capricornInsideHidesLineCage(signId: SignId, phase: ExplorePhase): boolean {
  return signId === "capricorn" && phase === "inside";
}

export function capricornPlateMatch(galaxy: SignGalaxy, vol: SignVolume | null): FigureMatch {
  if (vol) {
    const field = galaxyFigureBox(galaxy.stars);
    const painted = paintedFigureBox(vol);
    if (field && painted) {
      const live = figureMatchTransform(field, painted);
      if (live) return live;
    }
  }
  return CAPRICORN_FALLBACK_MATCH;
}

/** Map plate UV → galaxy-local xy (inverse of `plateHubUv`). */
export function galaxyPointFromPlateUv(
  uv: { u: number; v: number },
  match: FigureMatch,
  aspect = CAPRICORN_PLATE_ASPECT,
): { x: number; y: number } {
  const plateTall = PLATE_WIDE / Math.max(0.2, aspect);
  const stationX = (uv.u - 0.5) * PLATE_WIDE;
  const stationY = (uv.v - 0.5) * plateTall;
  return {
    x: (stationX - match.ox) / match.sx,
    y: (stationY + PLATE_OFFSET_Y - match.oy) / match.sy,
  };
}

export function applyCapricornPlatePoints(galaxy: SignGalaxy): SignGalaxy {
  if (galaxy.signId !== "capricorn") return galaxy;
  if (galaxy.points.length !== CAPRICORN_PLATE_LESSON_UV.length) return galaxy;
  const vol = getSignVolume("capricorn");
  const aspect = vol?.aspect ?? CAPRICORN_PLATE_ASPECT;
  const match = capricornPlateMatch(galaxy, vol);
  const points: SignTravelPoint[] = galaxy.points.map((p, i) => {
    const uv = CAPRICORN_PLATE_LESSON_UV[i]!;
    const { x, y } = galaxyPointFromPlateUv(uv, match, aspect);
    return { ...p, x, y };
  });
  return { ...galaxy, points };
}

/** Verify a mapped hub sits on the swirl UV (for tests). */
export function capricornHubPlateUv(galaxy: SignGalaxy, aspect = CAPRICORN_PLATE_ASPECT) {
  const hub = galaxy.points.find((p) => p.isHub) ?? galaxy.points[0]!;
  const match = capricornPlateMatch(galaxy, null);
  return plateHubUv(match, hub, PLATE_WIDE, aspect);
}
