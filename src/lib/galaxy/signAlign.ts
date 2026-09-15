import type { SignId } from "@/lib/chart/types";
import { GALAXY_SPAN, type SignGalaxy, type GalaxyStar } from "./signGalaxy";
import { getSignVolume, type SignVolume } from "./signVolume";
import { PLATE_WIDE } from "./temple";

/**
 * Aligning the live star-figure onto the painted plate.
 *
 * The enter dive cross-fades two drawings of the same animal: the painted PNG
 * (which carries the shape's beauty) and the live galaxy stars (which the camera
 * flies into). They are drawn at different sizes — the live figure spans the
 * square galaxy frame, the painted one sits inside a 16:9 plate — so the
 * hand-off used to jump.
 *
 * These helpers measure both boxes and return the transform that puts the live
 * figure exactly over the painted one, then blend that back to the galaxy's own
 * frame as the figure enlarges into the thing you fly through.
 *
 * Verified against Sagittarius: painted figure ≈ 9.3 × 6.5 units inside a
 * 16.5 × 7.05 plate; live figure ≈ 15.9 × 15.5 galaxy units.
 */

export type Box = { x0: number; y0: number; x1: number; y1: number };

export type FigureMatch = {
  /** Scale that maps the live figure's box onto the painted figure's box. */
  sx: number;
  sy: number;
  /** Station-local offset (the painted plate's own offset included). */
  ox: number;
  oy: number;
};

export type FieldFrame = {
  sx: number;
  sy: number;
  sxScale: number;
  ox: number;
  oy: number;
  oz: number;
};

/** Fraction of the painted pixels that count as "figure" (the plate has glow fringes). */
const PAINTED_CUT = 0.16;

/** Window over `galaxyForm` where the alignment hands over to the galaxy frame. */
export const MATCH_HOLD = 0.1;
export const MATCH_DONE = 0.7;

/** The plate mesh sits slightly forward/up of the station origin. */
export const PLATE_OFFSET_Y = 0.05;
export const PLATE_OFFSET_Z = -0.06;
/** The live field sits a touch behind the plate plane, as before. */
export const FIELD_OFFSET_Y = 0.05;
export const FIELD_OFFSET_Z = 0.35;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function smooth01(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function boxOfPoints(points: { x: number; y: number }[]): Box | null {
  if (!points.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  if (!Number.isFinite(x0) || !Number.isFinite(y0)) return null;
  return { x0, y0, x1, y1 };
}

/** Box of the live galaxy's animal stars, in galaxy-local units. */
export function galaxyFigureBox(stars: GalaxyStar[]): Box | null {
  return boxOfPoints(stars);
}

/**
 * Box of the painted figure, in station-local units.
 *
 * The alpha grid is the same one the plate sculpt uses: `x` runs left→right as
 * `u`, `y` runs top→bottom, so `v = 1 - y / (rows - 1)`. The plate mesh is a unit
 * plane scaled to `plateWide × plateWide / aspect`.
 */
export function paintedFigureBox(vol: SignVolume, plateWide = PLATE_WIDE): Box | null {
  const { cols, rows, alpha } = vol;
  if (cols < 2 || rows < 2) return null;
  const plateTall = plateWide / Math.max(0.2, vol.aspect);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let hit = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      if ((alpha[cy * cols + cx] ?? 0) < PAINTED_CUT) continue;
      hit++;
      const u = cx / (cols - 1);
      const v = 1 - cy / (rows - 1);
      const x = (u - 0.5) * plateWide;
      const y = (v - 0.5) * plateTall;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (hit < 12) return null;
  return { x0, y0, x1, y1 };
}

/**
 * Transform that lays the live figure over the painted one: scale by box ratio,
 * then offset so the box centres coincide (plate offset folded in).
 */
export function figureMatchTransform(field: Box, painted: Box): FigureMatch | null {
  const fw = field.x1 - field.x0;
  const fh = field.y1 - field.y0;
  const pw = painted.x1 - painted.x0;
  const ph = painted.y1 - painted.y0;
  if (fw < 1e-4 || fh < 1e-4 || pw < 0.4 || ph < 0.4) return null;
  const sx = pw / fw;
  const sy = ph / fh;
  const fcx = (field.x0 + field.x1) * 0.5;
  const fcy = (field.y0 + field.y1) * 0.5;
  const pcx = (painted.x0 + painted.x1) * 0.5;
  const pcy = (painted.y0 + painted.y1) * 0.5;
  return {
    sx,
    sy,
    ox: pcx - sx * fcx,
    oy: PLATE_OFFSET_Y + pcy - sy * fcy,
  };
}

/** The galaxy's own frame at this progress — what the field used before alignment. */
export function galaxyFrameScale(form: number) {
  return (PLATE_WIDE / GALAXY_SPAN) * (1.05 + clamp01(form) * 0.35);
}

/**
 * Field transform for the current progress: matches the painted figure while the
 * two are visible together, then hands over to the galaxy frame as the figure
 * grows into the form you fly through. At `form = 1` this equals the galaxy
 * frame exactly, so the landing geometry is untouched.
 */
export function fieldFrame(form: number, match: FigureMatch | null): FieldFrame {
  const deck = galaxyFrameScale(form);
  const ramp = smooth01((clamp01(form) - MATCH_HOLD) / (MATCH_DONE - MATCH_HOLD));
  const sx = match ? match.sx + (deck - match.sx) * ramp : deck;
  const sy = match ? match.sy + (deck - match.sy) * ramp : deck;
  const ox = match ? match.ox * (1 - ramp) : 0;
  const oy = FIELD_OFFSET_Y + (match ? (match.oy - FIELD_OFFSET_Y) * (1 - ramp) : 0);
  // Depth also starts on the painted plate's plane, so the two drawings project to
  // the *same* screen box during the hand-off (a 0.4-unit z gap was worth ~4% scale).
  const oz = match ? PLATE_OFFSET_Z + (FIELD_OFFSET_Z - PLATE_OFFSET_Z) * ramp : FIELD_OFFSET_Z;
  return { sx, sy, sxScale: deck, ox, oy, oz };
}

const matches = new Map<SignId, FigureMatch>();

/**
 * Cached alignment for a sign. Returns null until the painted PNG has been
 * measured (the gallery preloads it, so this resolves during the dive).
 */
export function getFigureMatch(signId: SignId, galaxy: SignGalaxy): FigureMatch | null {
  const hit = matches.get(signId);
  if (hit) return hit;
  const vol = getSignVolume(signId);
  if (!vol) return null;
  const field = galaxyFigureBox(galaxy.stars);
  const painted = paintedFigureBox(vol);
  if (!field || !painted) return null;
  const match = figureMatchTransform(field, painted);
  if (!match) return null;
  matches.set(signId, match);
  return match;
}

export function clearFigureMatchCache() {
  matches.clear();
}