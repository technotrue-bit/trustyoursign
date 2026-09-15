import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import type { SignId } from "@/lib/chart/types";
import { burstParams, burstRayCount, type BurstParams } from "./signBurst";
import { TEMPLE_SIGNS, type TemplePalette } from "./temple";

/**
 * The galaxy core — the light source at the heart of a sign's galaxy.
 *
 * The enter dive lands on the hub star; before this existed the room had no
 * light in it (thin lines, square markers, black). The core is drawn once per
 * sign into a canvas (deterministic — no per-frame randomness) and shown as a
 * camera-facing sprite, so it reads as the thing you flew into.
 *
 * See docs/superpowers/specs/2026-09-14-sign-enter-flythrough-design.md.
 */
export const CORE_PX = 512;

/** Local units for the sprite at rest (the field group scales it into world units). */
export const CORE_LOCAL_SIZE = 2.4;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Deterministic PRNG (mulberry32) — the core must look identical on every reload. */
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

/** How far the core has swelled into frame: 0.34 at first light → 1 at land. */
export function coreSwell(reveal: number) {
  return 0.34 + 0.66 * Math.pow(clamp01(reveal), 1.2);
}

/** Opacity is continuous across the landing: the same value at p = 1 and inside. */
export function coreOpacity(reveal: number, inside: boolean) {
  if (inside) return 0.94;
  return 0.94 * Math.pow(clamp01(reveal), 0.8);
}

/** Slow rotation while the dive is live; a calmer drift once you are inside. */
export function coreSpin(seconds: number, inside: boolean) {
  return seconds * (inside ? 0.035 : 0.12);
}

type Palette = { particle: string; accent: string; chest: string };

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function mixRgb(a: string, b: string, t: number) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const m = (i: number, j: number) => Math.round(i + (j - i) * t);
  return { r: m(x.r, y.r), g: m(x.g, y.g), b: m(x.b, y.b) };
}

function rgbaOf(c: { r: number; g: number; b: number }, a: number) {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

function toHex(c: { r: number; g: number; b: number }) {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

/** Relative luminance of a colour token (0–1). */
export function hexLuma(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Below this luminance an accent cannot carry the core's arms. */
export const CORE_DARK_LUMA = 0.35;
/** Lift applied to a dark accent, and the small one applied to every core. */
export const CORE_LIFT_DARK = 0.45;
export const CORE_LIFT_NORMAL = 0.12;

/**
 * Accent used to paint the core. Dark palette accents (Scorpio's near-wine red)
 * leave the landing with nothing to look at, so they are lifted toward the sign's
 * chest tone; brighter accents only get a touch of separation. Data-driven, so no
 * per-sign special-casing.
 */
export function coreAccent(palette: { accent: string; chest: string }): string {
  const t = hexLuma(palette.accent) < CORE_DARK_LUMA ? CORE_LIFT_DARK : CORE_LIFT_NORMAL;
  return toHex(mixRgb(palette.accent, palette.chest, t));
}

function paintCore(ctx: CanvasRenderingContext2D, s: number, palette: Palette, seed: number) {
  const c = s / 2;
  const rnd = rng(seed);
  const armCount = 2;
  const turns = 2.35;
  // Dark accents get lifted so the core always has something to read.
  const accent = coreAccent(palette);

  ctx.save();
  ctx.translate(c, c);

  // 1 — wide halo: the glow you see before the disk resolves.
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, c);
  halo.addColorStop(0, rgba(palette.chest, 0.5));
  halo.addColorStop(0.16, rgba(accent, 0.34));
  halo.addColorStop(0.42, rgba(palette.particle, 0.13));
  halo.addColorStop(1, rgba(palette.particle, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(-c, -c, s, s);

  // 2 — spiral arms: gold near the core, cooler at the rim.
  ctx.save();
  ctx.scale(1, 0.84);
  for (let arm = 0; arm < armCount; arm++) {
    const base = (arm / armCount) * Math.PI * 2;
    for (let i = 0; i < 1500; i++) {
      const u = Math.pow(rnd(), 0.72);
      const theta = u * turns * Math.PI * 2;
      const r = 0.035 * Math.exp(0.5 * theta) * c;
      if (r > c * 0.98) break;
      const jitter = (rnd() - 0.5) * (6 + r * 0.09);
      const ang = theta + base + (rnd() - 0.5) * 0.14;
      const x = Math.cos(ang) * r + jitter;
      const y = Math.sin(ang) * r + jitter;
      const edge = r / c;
      const alpha = (1 - edge) * (0.1 + rnd() * 0.42) * (0.35 + 0.65 * Math.pow(1 - edge, 1.6));
      const tint = mixRgb(accent, palette.particle, Math.min(1, edge * 1.15));
      ctx.fillStyle = rgbaOf(tint, alpha);
      const size = 0.6 + rnd() * (edge < 0.4 ? 1.9 : 1.1);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3 — dust lanes: dark material between the arms, gives the disk its grain.
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 420; i++) {
    const u = rnd();
    const theta = u * turns * Math.PI * 1.8;
    const r = 0.05 * Math.exp(0.5 * theta) * c;
    if (r > c * 0.9) break;
    const ang = theta + Math.PI / armCount + (rnd() - 0.5) * 0.1;
    const x = Math.cos(ang) * r * 1.02;
    const y = Math.sin(ang) * r * 0.84;
    ctx.fillStyle = `rgba(6,5,10,${0.05 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + rnd() * 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4 — granulation: the mottled inner disk.
  for (let i = 0; i < 900; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.pow(rnd(), 0.6) * c * 0.34;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.86;
    const warm = 1 - r / (c * 0.34);
    ctx.fillStyle = rgba(palette.chest, 0.05 + rnd() * 0.2 * (0.4 + warm));
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + rnd() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5 — the hot centre: what the camera actually lands on.
  const hot = ctx.createRadialGradient(0, 0, 0, 0, 0, c * 0.2);
  hot.addColorStop(0, "rgba(255,252,244,1)");
  hot.addColorStop(0.22, rgba(palette.chest, 0.95));
  hot.addColorStop(0.5, rgba(accent, 0.6));
  hot.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = hot;
  ctx.beginPath();
  ctx.arc(0, 0, c * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 6 — a few bright field stars around the core so it sits in a sky, not a void.
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = c * (0.42 + rnd() * 0.5);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.9;
    ctx.fillStyle = rgba(palette.chest, 0.35 + rnd() * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rnd() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

const cache = new Map<SignId, CanvasTexture>();

/** Cached per-sign core sprite. Disposed with the rest of the station on unmount. */
export function getSignCore(id: SignId): CanvasTexture | null {
  const hit = cache.get(id);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const sign = TEMPLE_SIGNS.find((s) => s.id === id) ?? TEMPLE_SIGNS[0]!;
  const canvas = document.createElement("canvas");
  canvas.width = CORE_PX;
  canvas.height = CORE_PX;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;
  paintCore(ctx, CORE_PX, sign.palette, 7 + TEMPLE_SIGNS.indexOf(sign) * 977);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  cache.set(id, tex);
  return tex;
}

export function clearSignCoreCache() {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}

/* ------------------------------------------------------------------ *
 * Ignition burst — the ray/shock-front pass of the core painter.
 *
 * This is the second pass of the same generator: same palette, same seeded
 * RNG, so all twelve signs get their own burst and none of it is authored
 * art. It is painted into its *own* canvas rather than into the landing core,
 * because the core sprite's look is the verified landing (metric M5/M7 in
 * docs/superpowers/specs/2026-09-15-aries-ignition-handoff-design.md) — the
 * burst is a new, transient sprite that only exists during the hand-off.
 * ------------------------------------------------------------------ */

export const BURST_PX = 512;

/** Thin, high-contrast radial rays around a soft additive shock front. */
function paintBurst(ctx: CanvasRenderingContext2D, s: number, palette: Palette, params: BurstParams, smallGpu: boolean) {
  const c = s / 2;
  const rnd = rng(params.seed);
  const accent = coreAccent(palette);
  const halo = mixRgb(palette.particle, palette.chest, params.haloWarm);
  const rays = burstRayCount(params, smallGpu);

  ctx.save();
  ctx.translate(c, c);
  ctx.globalCompositeOperation = "lighter";

  // 1 — the ignition halo. This is what fills the frame: the seed galaxy's light
  //     arriving before any structure resolves.
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, c);
  glow.addColorStop(0, rgbaOf(halo, params.haloAlpha + 0.22));
  glow.addColorStop(0.12, rgba(accent, params.haloAlpha + 0.06));
  glow.addColorStop(0.34, rgbaOf(halo, params.haloAlpha * 0.42));
  glow.addColorStop(0.62, rgba(palette.particle, params.haloAlpha * 0.12));
  glow.addColorStop(1, rgba(palette.particle, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(-c, -c, s, s);

  // 2 — ignition rays: thin, high contrast, radial. Hot white at the root,
  //     the sign's accent down the length. Each spoke is a small fan of strands
  //     at slightly different angles, lengths and weights, and every strand
  //     tapers to a point with its colour falling away over the last third — a
  //     rake of identical bars that stop square reads as striation, strands that
  //     die out at their own length read as light.
  for (let i = 0; i < rays; i++) {
    const base = (i / rays) * Math.PI * 2;
    // One lead strand, plus one or two flanks; the uneven count keeps the fan
    // from marching around the circle like a comb.
    const strands = 2 + (rnd() < 0.5 ? 1 : 0);
    for (let k = 0; k < strands; k++) {
      const lead = k === 0;
      const ang = base + (rnd() - 0.5) * params.raySpread * (lead ? 1 : 2.2);
      const reach = lead ? 1 : 0.42 + rnd() * 0.38;
      const len =
        c * (params.rayLenMin + rnd() * (params.rayLenMax - params.rayLenMin)) * reach;
      const w = params.rayWidth * (0.5 + rnd() * 1.0) * (lead ? 1 : 0.55);
      ctx.save();
      ctx.rotate(ang);
      const beam = ctx.createLinearGradient(0, 0, len, 0);
      // Round-1 body levels: the feathered tip is a shape fix, not a dimmer.
      beam.addColorStop(0, rgba(palette.chest, 0.75 + rnd() * 0.25));
      beam.addColorStop(0.22, rgba(accent, 0.5 + rnd() * 0.3));
      beam.addColorStop(0.62, rgba(accent, 0.16));
      beam.addColorStop(1, rgba(palette.particle, 0));
      ctx.fillStyle = beam;
      // The body keeps near-full width (that is the contrast that makes a ray
      // read) and collapses to a point only over the last quarter — so the end is
      // a feather, not a cut. The shoulder and the flank width are jittered so no
      // two strands end on the same arc.
      const shoulder = len * (0.72 + rnd() * 0.12);
      ctx.beginPath();
      ctx.moveTo(c * 0.04, -w * 0.5);
      ctx.lineTo(shoulder, -w * (0.36 + rnd() * 0.12));
      ctx.lineTo(len, 0);
      ctx.lineTo(shoulder * (0.9 + rnd() * 0.12), w * (0.36 + rnd() * 0.12));
      ctx.closePath();
      ctx.fill();
      // The hot filament in the middle of the ray, so it reads as light, not
      // paint: bright through its body, fading out over the last third rather
      // than stopping square.
      const fil = len * (0.62 + rnd() * 0.24);
      const filGrad = ctx.createLinearGradient(0, 0, fil, 0);
      filGrad.addColorStop(0, rgba(palette.chest, 0.62 + rnd() * 0.3));
      filGrad.addColorStop(0.68, rgba(palette.chest, 0.5 + rnd() * 0.2));
      filGrad.addColorStop(1, rgba(palette.chest, 0));
      ctx.fillStyle = filGrad;
      ctx.beginPath();
      ctx.moveTo(c * 0.05, -0.7);
      ctx.lineTo(fil * 0.72, -0.5);
      ctx.lineTo(fil, 0);
      ctx.lineTo(fil * 0.72, 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // 3 — sparks thrown off the front.
  if (params.sparkCount > 0) {
    ctx.fillStyle = rgba(palette.chest, 0.75);
    for (let i = 0; i < params.sparkCount; i++) {
      const a = rnd() * Math.PI * 2;
      const r = c * (params.rayLenMin * 0.5 + rnd() * 0.5);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.7 + rnd() * 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4 — the shock front: a soft additive ring, the edge of the blast.
  for (let band = 0; band < 3; band++) {
    ctx.beginPath();
    ctx.arc(0, 0, c * (params.ringRadius + band * 0.045), 0, Math.PI * 2);
    ctx.lineWidth = params.ringWidth * (1 - band * 0.22);
    ctx.strokeStyle = rgba(band === 0 ? palette.chest : accent, params.ringAlpha * (1 - band * 0.28));
    ctx.stroke();
  }

  // 5 — the seed itself: what the camera then flies into.
  const hot = ctx.createRadialGradient(0, 0, 0, 0, 0, c * 0.24);
  hot.addColorStop(0, "rgba(255,252,244,0.98)");
  hot.addColorStop(0.24, rgba(palette.chest, 0.8));
  hot.addColorStop(0.6, rgba(accent, 0.36));
  hot.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = hot;
  ctx.beginPath();
  ctx.arc(0, 0, c * 0.24, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

/** The short flash: a hot radial quad with a fast falloff. */
function paintBurstFlash(ctx: CanvasRenderingContext2D, s: number, palette: Palette, params: BurstParams) {
  const c = s / 2;
  ctx.save();
  ctx.translate(c, c);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c);
  g.addColorStop(0, "rgba(255,255,252,1)");
  g.addColorStop(0.08, rgba(palette.chest, 0.95));
  g.addColorStop(0.2, rgba(palette.chest, 0.5));
  g.addColorStop(0.42, rgba(coreAccent(palette), 0.22));
  g.addColorStop(0.72, rgba(palette.particle, 0.06));
  g.addColorStop(1, rgba(palette.particle, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-c, -c, s, s);
  // A quick four-point bloom so the flash has a shape, not just a disc.
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i / 4) * Math.PI * 2 + params.seed * 1e-4);
    const beam = ctx.createLinearGradient(0, 0, c, 0);
    beam.addColorStop(0, rgba(palette.chest, 0.55));
    beam.addColorStop(1, rgba(palette.chest, 0));
    ctx.fillStyle = beam;
    ctx.fillRect(0, -2, c, 4);
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

const burstCache = new Map<string, CanvasTexture>();

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D) => void): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;
  paint(ctx);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function signPalette(id: SignId): TemplePalette {
  const sign = TEMPLE_SIGNS.find((s) => s.id === id) ?? TEMPLE_SIGNS[0]!;
  return sign.palette;
}

/** Cached per-sign burst sprite: rays + shock front, from palette + seed. */
export function getSignBurst(id: SignId, smallGpu = false): CanvasTexture | null {
  const key = `${id}:${smallGpu ? "small" : "full"}`;
  const hit = burstCache.get(key);
  if (hit) return hit;
  const palette = signPalette(id);
  const params = burstParams(id, palette);
  const tex = canvasTexture(BURST_PX, (ctx) => paintBurst(ctx, BURST_PX, palette, params, smallGpu));
  if (!tex) return null;
  burstCache.set(key, tex);
  return tex;
}

/** Cached per-sign flash sprite (skipped on small GPUs by the caller). */
export function getSignBurstFlash(id: SignId): CanvasTexture | null {
  const key = `${id}:flash`;
  const hit = burstCache.get(key);
  if (hit) return hit;
  const palette = signPalette(id);
  const params = burstParams(id, palette);
  const tex = canvasTexture(BURST_PX, (ctx) => paintBurstFlash(ctx, BURST_PX, palette, params));
  if (!tex) return null;
  burstCache.set(key, tex);
  return tex;
}

export function clearSignBurstCache() {
  for (const tex of burstCache.values()) tex.dispose();
  burstCache.clear();
}
