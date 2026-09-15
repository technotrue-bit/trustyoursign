import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import type { SignId } from "@/lib/chart/types";
import { TEMPLE_SIGNS } from "./temple";

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

function paintCore(ctx: CanvasRenderingContext2D, s: number, palette: Palette, seed: number) {
  const c = s / 2;
  const rnd = rng(seed);
  const armCount = 2;
  const turns = 2.35;

  ctx.save();
  ctx.translate(c, c);

  // 1 — wide halo: the glow you see before the disk resolves.
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, c);
  halo.addColorStop(0, rgba(palette.chest, 0.5));
  halo.addColorStop(0.16, rgba(palette.accent, 0.3));
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
      const tint = mixRgb(palette.accent, palette.particle, Math.min(1, edge * 1.15));
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
  hot.addColorStop(0.5, rgba(palette.accent, 0.6));
  hot.addColorStop(1, rgba(palette.accent, 0));
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
