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
  /**
   * Roll of the figure about the view axis (radians). The station is billboarded,
   * so rolling the *camera* would rotate the billboard with it and cancel out —
   * the figure itself has to turn.
   */
  roll: number;
  /**
   * Lateral slide of the drawing layers (figure-local units) — moves a seam off
   * the hub's axis without moving the core or the travel nodes.
   */
  shift: number;
};

/** Fraction of the painted pixels that count as "figure" (the plate has glow fringes). */
const PAINTED_CUT = 0.16;

/** Window over `galaxyForm` where the alignment hands over to the galaxy frame. */
export const MATCH_HOLD = 0.1;
export const MATCH_DONE = 0.7;

/** How far the figure may turn as you enter (radians, ~18°). */
export const MAX_LANDING_ROLL = 0.32;

/**
 * A segment reads as a seam across the frame centre when it is long enough to
 * cross the view and its line passes close to the hub star (the point the camera
 * lands looking at). Libra is the case that forced this: its figure is a balance
 * whose post runs exactly through the hub, so the landing framed a hard vertical
 * line down the middle.
 */
const BEAM_MIN_LEN = 3;
const BEAM_HUB_CLEAR = 1.2;

/** Only near-vertical segments read as a seam down the frame; diagonals do not. */
const BEAM_NEAR_VERTICAL = (25 * Math.PI) / 180;

/** Target: no near-hub beam sits closer than this to the frame's vertical axis. */
export const BEAM_CLEAR_ANGLE = (20 * Math.PI) / 180;

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

/** Rotate a figure point about the view axis by `roll` radians. */
export function rotatedPoint(x: number, y: number, roll: number) {
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  return { x: x * c - y * s, y: x * s + y * c };
}

/** Angle of a segment from the frame's vertical axis: 0 = straight up/down, π/2 = flat. */
export function axisAngle(ax: number, ay: number, bx: number, by: number) {
  const dx = Math.abs(bx - ax);
  const dy = Math.abs(by - ay);
  if (dx < 1e-6 && dy < 1e-6) return Math.PI / 2;
  return Math.min(Math.atan2(dx, dy), Math.PI - Math.atan2(dx, dy));
}

/** Perpendicular distance from a point to a segment's infinite line. */
function lineDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return Math.hypot(px - ax, py - ay);
  return Math.abs(dy * (px - ax) - dx * (py - ay)) / len;
}

/** Long, near-vertical segments whose line passes close to the hub — the seams. */
export function seamBeams(
  galaxy: SignGalaxy,
): { ax: number; ay: number; bx: number; by: number }[] {
  const hub = galaxy.points[0];
  if (!hub) return [];
  const out: { ax: number; ay: number; bx: number; by: number }[] = [];
  for (const [a, b] of galaxy.lines) {
    const sa = galaxy.stars[a];
    const sb = galaxy.stars[b];
    if (!sa || !sb) continue;
    if (Math.hypot(sb.x - sa.x, sb.y - sa.y) < BEAM_MIN_LEN) continue;
    if (axisAngle(sa.x, sa.y, sb.x, sb.y) > BEAM_NEAR_VERTICAL) continue;
    if (lineDistance(hub.x, hub.y, sa.x, sa.y, sb.x, sb.y) > BEAM_HUB_CLEAR) continue;
    out.push({ ax: sa.x, ay: sa.y, bx: sb.x, by: sb.y });
  }
  return out;
}

const rolls = new Map<SignId, number>();

/**
 * How far to tilt the camera at landing so no near-hub segment of this sign's
 * figure runs down the frame's centre. Zero when the figure has no such segment
 * (most signs), so only the signs that need it move. Deterministic and cached.
 * The camera tilts, so the core stays exactly where it was aimed.
 */
export function landingRoll(signId: SignId, galaxy: SignGalaxy): number {
  const hit = rolls.get(signId);
  if (hit != null) return hit;
  const beams = seamBeams(galaxy);
  let best = 0;
  let bestScore = -1;
  if (beams.length) {
    for (let i = 1; i <= 24; i++) {
      const cand = (i / 24) * MAX_LANDING_ROLL;
      for (const sign of [1, -1]) {
        const roll = cand * sign;
        let worst = Infinity;
        for (const bm of beams) {
          const a = rotatedPoint(bm.ax, bm.ay, roll);
          const b = rotatedPoint(bm.bx, bm.by, roll);
          worst = Math.min(worst, axisAngle(a.x, a.y, b.x, b.y));
        }
        if (worst > bestScore + 1e-9) {
          bestScore = worst;
          best = roll;
        }
      }
    }
  }
  rolls.set(signId, best);
  return best;
}

export function clearLandingRollCache() {
  rolls.clear();
}

/** Clearance target: a seam must end up at least this far (figure-local units) off the hub's axis. */
export const SEAM_CLEAR_LOCAL = 0.8;
/** The lateral move is capped so a figure can never be shoved noticeably off-centre. */
export const MAX_LANDING_SHIFT = 1.6;

/** x of a beam's line where it crosses the hub's height (figure-local units). */
function beamXAtHubY(hubY: number, ax: number, ay: number, bx: number, by: number) {
  const dy = by - ay;
  if (Math.abs(dy) < 1e-6) return (ax + bx) / 2;
  return ax + ((bx - ax) * (hubY - ay)) / dy;
}

const shifts = new Map<SignId, number>();

/**
 * How far to slide the *drawing* (lines + stars) sideways at landing so no seam
 * segment crosses the hub, and therefore the frame centre. Nodes and the core stay
 * on the hub — the camera keeps aiming at the star you see, and the core keeps its
 * framing. Zero for signs with no such seam.
 *
 * Chosen by search, not by a fixed direction: a seam sitting left of the hub must
 * be pushed further left, one on the right further right, and when a sign has seams
 * on both sides one move has to satisfy both. Every candidate is scored by the
 * margin it leaves between the hub's axis and the *nearest* seam, so the pick is
 * the best available clearance, favouring the smallest move on a tie.
 *
 * Libra is the case that needed it: turning the figure alone leaves its balance post
 * and a 23° diagonal trading off at ~11.6°, so the post still crossed the middle.
 */
export function landingShift(signId: SignId, galaxy: SignGalaxy): number {
  const hit = shifts.get(signId);
  if (hit != null) return hit;
  const hub = galaxy.points[0];
  let chosen = 0;
  if (hub) {
    // Per seam: the displacement that would put it exactly through the hub.
    const centres = seamBeams(galaxy).map(
      (bm) => hub.x - beamXAtHubY(hub.y, bm.ax, bm.ay, bm.bx, bm.by),
    );
    const marginAt = (d: number) => Math.min(...centres.map((c) => Math.abs(d - c)));
    const clampShift = (d: number) => Math.max(-MAX_LANDING_SHIFT, Math.min(MAX_LANDING_SHIFT, d));
    let best = marginAt(0);
    for (const c of centres) {
      for (const d of [c - SEAM_CLEAR_LOCAL, c + SEAM_CLEAR_LOCAL]) {
        const clamped = clampShift(d);
        const margin = marginAt(clamped);
        const better = margin > best + 1e-9;
        const tie = Math.abs(margin - best) <= 1e-9 && Math.abs(clamped) < Math.abs(chosen) - 1e-9;
        if (better || tie) {
          chosen = clamped;
          best = margin;
        }
      }
    }
  }
  shifts.set(signId, chosen);
  return chosen;
}

export function clearLandingShiftCache() {
  shifts.clear();
}

/** Viewport height the landing composition is tuned for; shorter frames need more lift. */
export const LANDING_BIAS_REF_HEIGHT = 760;
/** Base lift on a normal-height frame: the core sits a touch above centre. */
export const LANDING_BIAS_BASE = 0.12;

/**
 * Composition bias for the landing pose, in NDC y: how far above centre the hub
 * is framed. The HUD copy block is pinned to the bottom, so on a short viewport
 * it climbs into the core — lift the core further the shorter the frame is.
 */
export function landingBiasNdc(viewHeight: number, base = LANDING_BIAS_BASE) {
  const lift = (LANDING_BIAS_REF_HEIGHT - viewHeight) / 1100;
  return Math.min(0.3, Math.max(base, base + lift));
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
export function fieldFrame(
  form: number,
  match: FigureMatch | null,
  rollTarget = 0,
  shiftTarget = 0,
): FieldFrame {
  const deck = galaxyFrameScale(form);
  const ramp = smooth01((clamp01(form) - MATCH_HOLD) / (MATCH_DONE - MATCH_HOLD));
  const sx = match ? match.sx + (deck - match.sx) * ramp : deck;
  const sy = match ? match.sy + (deck - match.sy) * ramp : deck;
  const ox = match ? match.ox * (1 - ramp) : 0;
  const oy = FIELD_OFFSET_Y + (match ? (match.oy - FIELD_OFFSET_Y) * (1 - ramp) : 0);
  // Depth also starts on the painted plate's plane, so the two drawings project to
  // the *same* screen box during the hand-off (a 0.4-unit z gap was worth ~4% scale).
  const oz = match ? PLATE_OFFSET_Z + (FIELD_OFFSET_Z - PLATE_OFFSET_Z) * ramp : FIELD_OFFSET_Z;
  // The turn and the slide ramp in with the same hand-over: the figure matches the
  // painting while the painting is visible, then moves as it becomes the form you fly into.
  const roll = rollTarget * ramp;
  const shift = shiftTarget * ramp;
  return { sx, sy, sxScale: deck, ox, oy, oz, roll, shift };
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
