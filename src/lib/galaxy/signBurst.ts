import type { SignId } from "@/lib/chart/types";
import { TEMPLE_SIGNS, type TemplePalette } from "./temple";
import type { FigureMatch } from "./signAlign";

/**
 * The ignition hand-off — the pulse that turns the painted figure into the galaxy.
 *
 * Entering a sign used to cross-fade: the painting died while the live figure was
 * still dim, so the middle of the shot went black (measured 1.63% lit / 2.63%
 * centre-lit at t = 1.2s against a 99.97% reference peak). The reference does
 * something else: the seed galaxy inside the figure's body **ignites**, the blast
 * consumes the figure from within, and the galaxy you then fly into forms out of it.
 *
 * This module is that beat, as numbers: one pulse on the enter clock plus the
 * channels that ride it — figure ignition (lights up *before* it is consumed),
 * dissolve (erodes outward from the hub, measured, not guessed), debris push and
 * the short flash. Everything random comes from the sign's seeded RNG, so a sign's
 * burst is byte-identical on every reload and two signs never share one.
 *
 * No allocations here: all of it is scalar arithmetic on cached, frozen parameter
 * records, so the render loop can call it every frame.
 *
 * See docs/superpowers/specs/2026-09-15-aries-ignition-handoff-design.md.
 */

/** Enter-clock windows (progress 0 → 1 over the 4.5s dive). */
export const BURST_IGNITE = 0.13;
export const BURST_FULL = 0.27;
export const BURST_HOLD = 0.58;
export const BURST_END = 0.86;
/**
 * Dissolve: the painted plate opens up from the hub across this window.
 *
 * Timed to the reference's beats, not to the fade: the front starts moving just
 * as the burst lights inside the figure, so the light is what opens it; the
 * figure is still readable through the ignition and the ramp; the front passes
 * the whole frame only after the burst peak (DISSOLVE_END > BURST_FULL), and is
 * done exactly as the live figure completes (enterGalaxyForm reaches 1 at 0.56).
 * The hand-off is light eating the painting — never a crossfade (M11 in
 * docs/superpowers/specs/2026-09-15-aries-ignition-handoff-design.md).
 */
export const DISSOLVE_START = 0.18;
export const DISSOLVE_END = 0.58;
/**
 * Shape of the front. A linear front has eaten the whole body by the time the
 * capture's peak frame lands, which is the round-1 failure in different clothes:
 * the hole opens from a pinpoint at the hub and accelerates outward as the blast
 * grows, so the figure reads as being eaten while the light is still arriving.
 */
export const DISSOLVE_FRONT_CURVE = 1.35;
/** Reduced motion: a slow brighten and dissolve instead of a spike. */
export const REDUCED_START = 0.1;
export const REDUCED_FULL = 0.6;
export const REDUCED_END = 1;
/** Flash shape in enter-progress units (120ms in, 500ms out of a 4.5s dive). */
export const FLASH_IN = 0.12 / 4.5;
export const FLASH_OUT = 0.5 / 4.5;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function smooth01(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Deterministic PRNG (mulberry32) — same generator the core painter uses. A burst
 * must be identical on every reload, so nothing here may touch Math.random.
 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-sign burst recipe. All scalars — the painter blends the sign's palette in. */
export type BurstParams = {
  seed: number;
  /** Thin high-contrast ignition rays. */
  rays: number;
  rayLenMin: number;
  rayLenMax: number;
  rayWidth: number;
  raySpread: number;
  sparkCount: number;
  /** Soft additive shock front. */
  ringRadius: number;
  ringWidth: number;
  ringAlpha: number;
  /** How warm the halo leans between the sign's particle and chest tones. */
  haloWarm: number;
  haloAlpha: number;
  /** Rotation the rays pick up while the burst is live (radians). */
  spin: number;
  /** Sprite opacity at the pulse peak, and its size in figure-local units. */
  gain: number;
  sizeMin: number;
  sizeMax: number;
  /** Erode mask: feather on the front, and how ragged its edge is. */
  dissolveSoft: number;
  dissolveNoise: number;
  dissolveRagged: number;
  /** The short additive flash at the hub (skipped on small GPUs). */
  flashSize: number;
  flashGain: number;
  /** Radial impulse handed to the flight dust. */
  debrisPush: number;
  debrisSpan: number;
};

const paramCache = new Map<string, BurstParams>();

function paletteKey(palette: TemplePalette) {
  return `${palette.particle}|${palette.accent}|${palette.chest}`;
}

/**
 * The burst recipe for a sign. Cached and frozen: repeat calls hand back the same
 * object (so the render loop allocates nothing), and the same sign always gets the
 * identical recipe.
 */
export function burstParams(signId: SignId, palette?: TemplePalette): BurstParams {
  const index = Math.max(0, TEMPLE_SIGNS.findIndex((s) => s.id === signId));
  const pal = palette ?? TEMPLE_SIGNS[index]?.palette ?? TEMPLE_SIGNS[0]!.palette;
  const key = `${signId}:${paletteKey(pal)}`;
  const hit = paramCache.get(key);
  if (hit) return hit;
  const rnd = rng(0x51ed ^ ((index + 1) * 977));
  const rays = 18 + Math.floor(rnd() * 26);
  const rayLenMin = 0.34 + rnd() * 0.18;
  const rayLenMax = Math.max(rayLenMin + 0.2, 0.72 + rnd() * 0.26);
  const params: BurstParams = Object.freeze({
    seed: (0x9e37 + (index + 1) * 9176) >>> 0,
    rays,
    rayLenMin,
    rayLenMax,
    rayWidth: 1 + rnd() * 2.4,
    raySpread: 0.05 + rnd() * 0.12,
    sparkCount: 10 + Math.floor(rnd() * 14),
    ringRadius: 0.44 + rnd() * 0.16,
    ringWidth: 3 + rnd() * 7,
    ringAlpha: 0.1 + rnd() * 0.14,
    haloWarm: rnd(),
    haloAlpha: 0.3 + rnd() * 0.16,
    spin: 0.25 + rnd() * 0.5,
    gain: 0.85 + rnd() * 0.15,
    sizeMin: 2.6,
    sizeMax: 9.4 + rnd() * 1.8,
    dissolveSoft: 0.1 + rnd() * 0.05,
    dissolveNoise: 12 + rnd() * 14,
    dissolveRagged: 0.05 + rnd() * 0.05,
    flashSize: (9.4 + 1.8) * (0.46 + rnd() * 0.22),
    flashGain: 0.85 + rnd() * 0.15,
    debrisPush: 1.5 + rnd() * 1.3,
    debrisSpan: 0.55 + rnd() * 0.35,
  });
  paramCache.set(key, params);
  return params;
}

export function clearBurstParamCache() {
  paramCache.clear();
}

/**
 * Ray count at the current quality gate. The burst's particle ceiling rides the
 * same `isSmallGpu()` switch as everything else in the scene.
 */
export function burstRayCount(params: BurstParams, smallGpu: boolean) {
  return smallGpu ? Math.max(10, Math.floor(params.rays * 0.5)) : params.rays;
}

/** The pulse: rises, holds through the burst, decays into the formed galaxy. */
export function burstPulse(progress: number): number {
  const p = clamp01(progress);
  if (p <= BURST_IGNITE || p >= BURST_END) return 0;
  if (p < BURST_FULL) return smooth01((p - BURST_IGNITE) / (BURST_FULL - BURST_IGNITE));
  if (p <= BURST_HOLD) return 1;
  return 1 - smooth01((p - BURST_HOLD) / (BURST_END - BURST_HOLD));
}

/** Reduced motion: a slow brighten that fades out — no spike, no flash. */
export function burstPulseReduced(progress: number): number {
  const p = clamp01(progress);
  if (p <= REDUCED_START || p >= REDUCED_END) return 0;
  if (p < REDUCED_FULL) return smooth01((p - REDUCED_START) / (REDUCED_FULL - REDUCED_START));
  return 1 - smooth01((p - REDUCED_FULL) / (REDUCED_END - REDUCED_FULL));
}

/**
 * The short hub flash: ~120ms in, ~500ms out, centred on the pulse's peak. Skipped
 * entirely under reduced motion (the slow brighten already covers the beat).
 */
export function flashPulse(progress: number, peak = BURST_FULL): number {
  const p = clamp01(progress);
  const up = peak - FLASH_IN;
  const down = peak + FLASH_OUT;
  if (p <= up || p >= down) return 0;
  if (p < peak) return smooth01((p - up) / (peak - up));
  return Math.pow(1 - smooth01((p - peak) / (down - peak)), 1.35);
}

/**
 * Figure ignition — the live figure lights up *before* the blast consumes it, so
 * the middle of the shot is never black. Starts earlier and outlives the pulse
 * (it hands over to the formed galaxy, which is lit anyway).
 */
export function burstIgnition(progress: number): number {
  const p = clamp01(progress);
  if (p <= 0.08) return 0;
  if (p < 0.26) return smooth01((p - 0.08) / (0.26 - 0.08));
  if (p <= 0.6) return 1;
  return 1 - smooth01((p - 0.6) / (0.84 - 0.6));
}

/** How far the painted plate has been eaten away from its hub: 0 → 1. */
export function burstDissolve(progress: number): number {
  const p = clamp01(progress);
  const u = smooth01((p - DISSOLVE_START) / (DISSOLVE_END - DISSOLVE_START));
  return Math.pow(u, DISSOLVE_FRONT_CURVE);
}

/** Radial impulse the shock front hands the flight dust. */
export function burstImpulse(progress: number): number {
  const pulse = burstPulse(progress);
  return pulse <= 0 ? 0 : Math.pow(pulse, 0.7);
}

/** Sprite size at the current pulse — the front expands as it brightens. */
export function burstSpriteSize(pulse: number, params: BurstParams): number {
  const u = clamp01(pulse);
  if (u <= 0) return 0;
  return params.sizeMin + (params.sizeMax - params.sizeMin) * Math.sqrt(u);
}

export function burstFlashSize(flash: number, params: BurstParams): number {
  const u = clamp01(flash);
  if (u <= 0) return 0;
  return params.flashSize * (0.35 + 0.65 * Math.sqrt(u));
}

/** Rays turn as the burst grows, so the front never reads as a still image. */
export function burstSpinAt(progress: number, params: BurstParams): number {
  return burstPulse(progress) * params.spin;
}

/**
 * Where the painting ignites, in plate UV.
 *
 * The aligned hub star is the point on the *painting* where the seed galaxy sits —
 * `figureMatch` is the runtime-measured transform that lays the live figure exactly
 * over the painted one (signAlign), so this is data-driven and works for any sign.
 * The plate mesh is a unit plane scaled to `plateWide × plateWide / aspect` and
 * centred at (0, PLATE_OFFSET_Y); `match.oy` already folds that offset in.
 */
export function plateHubUv(
  match: FigureMatch,
  hub: { x: number; y: number },
  plateWide: number,
  aspect: number,
  plateOffsetY = 0.05,
): { u: number; v: number } {
  const plateTall = plateWide / Math.max(0.2, aspect);
  const x = hub.x * match.sx + match.ox;
  const y = hub.y * match.sy + match.oy - plateOffsetY;
  return {
    u: Math.min(0.95, Math.max(0.05, x / plateWide + 0.5)),
    v: Math.min(0.95, Math.max(0.05, y / plateTall + 0.5)),
  };
}

/**
 * Scale of the noise's second axis in the erode mask (`noise * 0.83`). Named and
 * shared so the GLSL body and `dissolveMaskDistance` cannot drift apart.
 */
export const DISSOLVE_NOISE_SPAN = 0.83;

/**
 * Phase of the erode mask's noise term for a sign's seed — the ONE seed
 * derivation. Both call sites use it: `dissolveMaskDistance` below (what the
 * unit tests exercise) and the plate shader's `uSeed` uniform, which GalaxyIntro
 * builds with `plateDissolveUniforms`. They used to disagree (`seed % 977 * 0.01`
 * in the shader against `seed * 1e-4` here), which made the test vouch for
 * arithmetic the renderer never ran. Do not inline this again.
 */
export function dissolveSeedPhase(seed: number): number {
  return seed * 1e-4;
}

/**
 * Erode mask for the painted plate, as a signed distance in plate-height units:
 * negative inside the hole. Ragged by a cheap analytic noise so the front reads as
 * burning material rather than a mechanical circle. Pure, so the shader and the
 * tests can share the definition.
 */
export function dissolveMaskDistance(
  u: number,
  v: number,
  hubUv: { u: number; v: number },
  aspect: number,
  dissolve: number,
  params: BurstParams,
): number {
  const dx = (u - hubUv.u) * aspect;
  const dy = v - hubUv.v;
  const r = Math.hypot(dx, dy);
  const phase = dissolveSeedPhase(params.seed);
  const n =
    Math.sin(u * params.dissolveNoise + phase) *
    Math.cos(v * (params.dissolveNoise * DISSOLVE_NOISE_SPAN) - phase);
  const front = dissolve * DISSOLVE_RADIUS_MAX + n * params.dissolveRagged;
  return r - front;
}

/** Radius (plate-height units) the front reaches at dissolve = 1: past every corner. */
export const DISSOLVE_RADIUS_MAX = 1.15;

/** The mask uniforms the plate shader needs; `uDissolve` / `uHubUv` are per-frame. */
export type PlateDissolveUniforms = {
  uSoft: { value: number };
  uNoise: { value: number };
  uSeed: { value: number };
  uRagged: { value: number };
  uRadius: { value: number };
};

/**
 * Uniform set for the plate's erode mask, from the same params (and the same
 * seed derivation) as `dissolveMaskDistance`. GalaxyIntro calls this — the
 * numbers are never built by hand at the call site.
 */
export function plateDissolveUniforms(params: BurstParams): PlateDissolveUniforms {
  return {
    uSoft: { value: params.dissolveSoft },
    uNoise: { value: params.dissolveNoise },
    uSeed: { value: dissolveSeedPhase(params.seed) },
    uRagged: { value: params.dissolveRagged },
    uRadius: { value: DISSOLVE_RADIUS_MAX },
  };
}

/**
 * GLSL body of the erode mask — spliced into the plate material's fragment
 * shader by GalaxyIntro, and the exact arithmetic `dissolveMaskDistance`
 * evaluates. Constants come from this module, so changing one changes both.
 */
export const PLATE_DISSOLVE_GLSL = [
  "  // Ignition dissolve — the blast eats the painting from its hub outward.",
  "  // Same arithmetic as dissolveMaskDistance() in signBurst.ts (unit-tested there).",
  "  vec2 d = vec2((vTysPlateUv.x - uHubUv.x) * uAspect, vTysPlateUv.y - uHubUv.y);",
  "  float r = length(d);",
  `  float n = sin(vTysPlateUv.x * uNoise + uSeed) * cos(vTysPlateUv.y * (uNoise * ${DISSOLVE_NOISE_SPAN.toFixed(2)}) - uSeed);`,
  "  float front = uDissolve * uRadius + n * uRagged;",
  "  diffuseColor.a *= smoothstep(front - uSoft, front + uSoft, r);",
].join("\n");
