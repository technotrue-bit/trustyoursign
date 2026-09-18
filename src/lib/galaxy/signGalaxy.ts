import type { SignId } from "@/lib/chart/types";
import { CONSTELLATIONS, type Figure, type StarPt } from "./constellations";
import { insightsForSign, type InsightTone } from "./signInsights";
import { burstDissolve, burstIgnition, burstImpulse, burstPulse, burstPulseReduced, DISSOLVE_END } from "./signBurst";
import { TEMPLE_SIGNS, type TempleSign } from "./temple";

export type ExplorePhase = "idle" | "fading" | "diving" | "inside" | "exiting";

/** Local galaxy space: animal figure xy scaled, z from depth. */
export type GalaxyStar = {
  x: number;
  y: number;
  z: number;
  mag: number;
};

export type PointPurposeKind = "hub" | InsightTone;

export type PointPurpose = {
  kind: PointPurposeKind;
  title: string;
  body: string;
};

export type SignTravelPoint = {
  id: string;
  starIndex: number;
  x: number;
  y: number;
  z: number;
  mag: number;
  purpose: PointPurpose;
  isHub: boolean;
};

export type SignGalaxy = {
  signId: SignId;
  name: string;
  stars: GalaxyStar[];
  lines: [number, number][];
  points: SignTravelPoint[];
};

/** World units across the animal figure in local galaxy space. */
export const GALAXY_SPAN = 22;
/** Soft depth so the form reads as a volume, not a card. */
export const GALAXY_DEPTH = 7.2;
/**
 * Travel nodes sit deeper than the silhouette stars — inside the sign's galaxy
 * volume (the swirl you dive into), not stuck as stickers on the plate face.
 * Silhouette z tops out near ~0.55 * GALAXY_DEPTH; keep the portal past that.
 */
export const NODE_DEPTH_NEAR = GALAXY_DEPTH * 0.72;
export const NODE_DEPTH_FAR = GALAXY_DEPTH * 1.35;

const cache = new Map<SignId, SignGalaxy>();

function smooth01(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Map animal figure bounds into a shared galaxy frame. */
export function liftAnimalStar(star: StarPt, bounds: { maxR: number }): GalaxyStar {
  const scale = bounds.maxR > 1e-6 ? (GALAXY_SPAN * 0.5) / bounds.maxR : 1;
  const x = star.x * scale;
  const y = star.y * scale;
  const r = Math.hypot(star.x, star.y) / Math.max(bounds.maxR, 1e-6);
  const z = (0.55 - r) * GALAXY_DEPTH * (0.55 + star.mag * 0.45);
  return { x, y, z, mag: star.mag };
}

export function animalBounds(figure: Figure) {
  let maxR = 0;
  for (const s of figure.stars) {
    maxR = Math.max(maxR, Math.hypot(s.x, s.y));
  }
  return { maxR: Math.max(maxR, 1) };
}

function lineDegree(lines: [number, number][], n: number) {
  const deg = new Float32Array(n);
  for (const [a, b] of lines) {
    if (a >= 0 && a < n) deg[a]!++;
    if (b >= 0 && b < n) deg[b]!++;
  }
  return deg;
}

/** Major animal stars: endpoints, joints, and bright cores — travel-point anchors. */
export function pickMajorStarIndices(figure: Figure, maxPoints = 10): number[] {
  const n = figure.stars.length;
  if (n === 0) return [];
  const deg = lineDegree(figure.lines, n);
  const scored: { i: number; score: number }[] = [];
  for (let i = 0; i < n; i++) {
    const s = figure.stars[i]!;
    const d = deg[i] ?? 0;
    const joint = d >= 2 ? 1.35 : d === 1 ? 1 : 0.55;
    const bright = s.mag;
    const center = 1 - Math.min(1, Math.hypot(s.x, s.y) / 3.2);
    scored.push({ i, score: bright * 1.1 + joint * 0.85 + center * 0.55 });
  }
  scored.sort((a, b) => b.score - a.score);
  const picked: number[] = [];
  const used = new Set<number>();
  for (const row of scored) {
    if (picked.length >= maxPoints) break;
    if (used.has(row.i)) continue;
    // Prefer spatial spread so travel nodes stay readable when framed.
    const star = figure.stars[row.i]!;
    let ok = true;
    for (const j of picked) {
      const o = figure.stars[j]!;
      if (Math.hypot(star.x - o.x, star.y - o.y) < 0.58) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    used.add(row.i);
    picked.push(row.i);
  }
  if (picked.length === 0) picked.push(0);
  return picked;
}

function purposeCatalog(temple: TempleSign): PointPurpose[] {
  const insights = insightsForSign(temple.id);
  const list: PointPurpose[] = [
    {
      kind: "hub",
      title: "Galaxy threshold",
      body: `You are inside ${temple.name}'s galaxy. Tap a star to learn this sign — or begin a birth chart for your own sky.`,
    },
  ];
  for (const insight of insights) {
    list.push({
      kind: insight.tone,
      title: insight.title,
      body: insight.body,
    });
  }
  // Keep a few temple facets as extra "info" stars when the figure has many points.
  list.push({
    kind: "info",
    title: "Essence",
    body: temple.essence,
  });
  list.push({
    kind: "info",
    title: "Season",
    body: temple.dates,
  });
  list.push({
    kind: "info",
    title: temple.chakra[0]!.toUpperCase() + temple.chakra.slice(1),
    body: temple.chakraNote,
  });
  return list;
}

function assignPurposes(
  signId: SignId,
  starIndices: number[],
  stars: GalaxyStar[],
  temple: TempleSign,
): SignTravelPoint[] {
  const catalog = purposeCatalog(temple);
  // Hub / portal = nearest the figure center — the spiral glow you dive into.
  let hubAt = 0;
  let hubScore = Number.POSITIVE_INFINITY;
  for (let k = 0; k < starIndices.length; k++) {
    const g = stars[starIndices[k]!]!;
    const dist = Math.hypot(g.x, g.y) / (GALAXY_SPAN * 0.5);
    const score = dist - g.mag * 0.15;
    if (score < hubScore) {
      hubScore = score;
      hubAt = k;
    }
  }
  const order = starIndices.map((_, k) => k);
  order.sort((a, b) => (a === hubAt ? -1 : b === hubAt ? 1 : a - b));

  const points: SignTravelPoint[] = [];
  let purposeCursor = 0;
  let interiorSlot = 0;
  const interiorCount = Math.max(1, starIndices.length - 1);
  for (const ord of order) {
    const starIndex = starIndices[ord]!;
    const g = stars[starIndex]!;
    const isHub = ord === hubAt;
    const purpose = isHub
      ? catalog[0]!
      : catalog[1 + (purposeCursor++ % Math.max(1, catalog.length - 1))]!;
    // Interior depth: hub is the near portal; other nodes fan deeper into the galaxy.
    const depthT = isHub ? 0 : (interiorSlot++ + 0.5) / interiorCount;
    const z = isHub
      ? NODE_DEPTH_NEAR
      : NODE_DEPTH_NEAR + depthT * (NODE_DEPTH_FAR - NODE_DEPTH_NEAR);
    // Slight radial expand on non-hub XY so majors breathe without leaving the form.
    const radial = isHub ? 0.35 : 1.14;
    points.push({
      id: `${signId}-${starIndex}`,
      starIndex,
      // Keep XY from the animal layout so nodes sit *within* the silhouette,
      // but push Z so they live inside the galaxy volume past the plate face.
      x: g.x * radial,
      y: g.y * radial,
      z,
      mag: g.mag,
      purpose,
      isHub,
    });
  }
  // Stable visual order: hub first, then by depth (near → far).
  points.sort((a, b) => {
    if (a.isHub !== b.isHub) return a.isHub ? -1 : 1;
    return a.z - b.z;
  });
  return points;
}

export function buildSignGalaxy(signId: SignId): SignGalaxy {
  const constellation = CONSTELLATIONS.find((c) => c.id === signId) ?? CONSTELLATIONS[0]!;
  const temple = TEMPLE_SIGNS.find((s) => s.id === signId) ?? TEMPLE_SIGNS[0]!;
  const figure = constellation.animal;
  const bounds = animalBounds(figure);
  // Silhouette stars = the plate window / form. Travel points are separate and deeper.
  const stars = figure.stars.map((s) => liftAnimalStar(s, bounds));
  const majors = pickMajorStarIndices(figure);
  const points = assignPurposes(signId, majors, stars, temple);
  return {
    signId,
    name: constellation.name,
    stars,
    lines: figure.lines.map(([a, b]) => [a, b] as [number, number]),
    points,
  };
}

export function getSignGalaxy(signId: SignId): SignGalaxy {
  const hit = cache.get(signId);
  if (hit) return hit;
  const built = buildSignGalaxy(signId);
  cache.set(signId, built);
  return built;
}

export function clearSignGalaxyCache() {
  cache.clear();
}

/**
 * Ease helpers for the enter choreography (single p clock; overlapping windows).
 *
 * Three beats: the painted figure holds the frame, the camera accelerates
 * through the live figure, then the shot lands inside the galaxy on its core.
 * See docs/superpowers/specs/2026-09-14-sign-enter-flythrough-design.md.
 */
export function enterWorldFade(progress: number) {
  return 1 - smooth01(Math.min(1, progress / 0.2));
}

/**
 * Plate opacity through the enter (M11).
 *
 * This clock does NOT kill the painting — the erode mask does (`dissolveMaskDistance`
 * / the plate shader). The plate holds fully opaque through the whole burst ramp and
 * peak, which is what the reference does: the ram stays solid and readable until the
 * light arrives inside it, and is then eaten outward from the hub. Only once the front
 * has passed the frame (DISSOLVE_END) does this channel let go, so its death is caused
 * by the blast rather than by a fade that finished first. Seen from the other side, no
 * painted wall can reach the lens: from DISSOLVE_END on, every plate pixel is masked.
 */
export const PLATE_HOLD_TO = DISSOLVE_END + 0.02;
/** Wholly transparent by here — after the hand-off, well before the landing. */
export const PLATE_GONE_BY = 0.7;

export function enterPlateFade(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return 1 - smooth01((p - PLATE_HOLD_TO) / (PLATE_GONE_BY - PLATE_HOLD_TO));
}

export function enterGalaxyForm(progress: number) {
  // Live figure takes over as the plate dies, so the middle beat is never black.
  // Fully formed just past halfway: by the time the plate is gone the star-figure
  // already owns the frame.
  return smooth01(Math.max(0, Math.min(1, (progress - 0.06) / (0.56 - 0.06))));
}

export function enterDive(progress: number) {
  return smooth01(Math.max(0, Math.min(1, (progress - 0.03) / (0.86 - 0.03))));
}

/** Extra travel in the back half — the surge that carries you through the form. */
export function enterRush(progress: number) {
  const u = smooth01(Math.max(0, Math.min(1, (progress - 0.3) / (1 - 0.3))));
  return Math.pow(u, 1.35);
}

/** How far the galaxy core has swelled into the hero of the shot. */
export function enterCoreReveal(progress: number) {
  return smooth01(Math.max(0, Math.min(1, (progress - 0.34) / (1 - 0.34))));
}

/** Look/approach bias toward the hub star — starts early so the dive reads as "into that star". */
export function enterHubSettle(progress: number) {
  return smooth01(Math.max(0, Math.min(1, (progress - 0.6) / (1 - 0.6))));
}

/**
 * The ignition hand-off — a new pulse on the same clock, centred on the crossfade
 * that used to be a dark hole. The painted figure lights (ignition), the blast
 * consumes it from within (dissolve), and the burst itself carries the shot
 * (burst) while the debris rides the shock front (impulse). Under reduced motion
 * the pulse degrades to a slow brighten: no flash, no spike.
 *
 * See docs/superpowers/specs/2026-09-15-aries-ignition-handoff-design.md.
 */
export function enterBurst(progress: number, reduced = false) {
  const p = Math.min(1, Math.max(0, progress));
  return reduced ? burstPulseReduced(p) : burstPulse(p);
}

/** Figure brighten: the body lights up before the blast consumes it. */
export function enterBurstIgnition(progress: number, reduced = false) {
  const p = Math.min(1, Math.max(0, progress));
  // Reduced motion: a slower brighten that still clears before the landing.
  if (reduced) {
    if (p <= 0.08) return 0;
    if (p < 0.5) return smooth01((p - 0.08) / 0.42);
    return 1 - smooth01((p - 0.5) / 0.45);
  }
  return burstIgnition(p);
}

/** 0 → 1 as the painted plate is eaten away outward from the hub. */
export function enterBurstDissolve(progress: number) {
  return burstDissolve(Math.min(1, Math.max(0, progress)));
}

/** Radial push the shock front hands the flight dust. */
export function enterBurstImpulse(progress: number, reduced = false) {
  const p = Math.min(1, Math.max(0, progress));
  if (reduced) return burstPulseReduced(p) * 0.5;
  return burstImpulse(p);
}

/** Corridor leftovers (disk, corners, station cloud, plate) hard-off after land. */
export function insideHardGateHidesLeftovers(phase: ExplorePhase): boolean {
  return phase === "inside";
}
