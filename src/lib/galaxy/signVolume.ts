import type { SignId } from "@/lib/chart/types";
import { isSmallGpu } from "@/lib/gpu";
import { SIGN_ART, signArtImage } from "./signArtMedia";

export type VolumeStar = { x: number; y: number; z: number; mag: number };

export type SignVolume = {
  id: SignId;
  aspect: number;
  cols: number;
  rows: number;
  depth: Float32Array;
  alpha: Float32Array;
  stars: VolumeStar[];
};

const volumes = new Map<SignId, SignVolume>();
const SMALL = typeof window !== "undefined" && isSmallGpu();
const COLS = SMALL ? 52 : 72;
const ROWS = SMALL ? 30 : 42;
const STAR_CAP = SMALL ? 480 : 860;

function hash(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function build(id: SignId, img: HTMLImageElement): SignVolume {
  const cols = COLS;
  const rows = ROWS;
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  const empty: SignVolume = {
    id,
    aspect,
    cols,
    rows,
    depth: new Float32Array(cols * rows),
    alpha: new Float32Array(cols * rows),
    stars: [],
  };
  if (!ctx) return empty;
  ctx.drawImage(img, 0, 0, cols, rows);
  const pix = ctx.getImageData(0, 0, cols, rows).data;
  const alpha = new Float32Array(cols * rows);
  const luma = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const o = i * 4;
    const a = pix[o + 3]! / 255;
    const r = pix[o]! / 255;
    const g = pix[o + 1]! / 255;
    const b = pix[o + 2]! / 255;
    alpha[i] = a;
    luma[i] = (0.3 * r + 0.55 * g + 0.15 * b) * a;
  }
  const dist = new Float32Array(cols * rows);
  for (let i = 0; i < dist.length; i++) dist[i] = alpha[i]! > 0.07 ? 40 : 0;
  for (let pass = 0; pass < 10; pass++) {
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        if (dist[i] === 0) continue;
        const n = Math.min(dist[i - 1]!, dist[i + 1]!, dist[i - cols]!, dist[i + cols]!) + 1;
        if (n < dist[i]!) dist[i] = n;
      }
    }
  }
  let maxD = 1;
  for (let i = 0; i < dist.length; i++) {
    const v = dist[i]!;
    if (v > 0 && v < 39 && v > maxD) maxD = v;
  }
  const depth = new Float32Array(cols * rows);
  const raw: VolumeStar[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const a = alpha[i]!;
      if (a < 0.06) continue;
      const nx = x / (cols - 1) - 0.5;
      const ny = 0.5 - y / (rows - 1);
      const edge = Math.min(1, dist[i]! / maxD);
      const body = luma[i]!;
      const z = (0.12 + edge * 0.88) * (0.38 + body * 0.78);
      depth[i] = z;
      const pick = hash(i + 19) < 0.38 + body * 0.45 + a * 0.2;
      if (!pick || a < 0.1) continue;
      const jx = hash(i * 3 + 1) - 0.5;
      const jy = hash(i * 5 + 2) - 0.5;
      const jz = hash(i * 7 + 3) - 0.5;
      raw.push({
        x: nx + jx * 0.01,
        y: ny + jy * 0.01,
        z: z + jz * 0.1,
        mag: Math.min(1, 0.28 + body * 0.85 + edge * 0.18),
      });
    }
  }
  raw.sort((p, q) => q.mag - p.mag);
  const stars = raw.slice(0, STAR_CAP);
  return { id, aspect, cols, rows, depth, alpha, stars };
}

export function sampleVolumeAlpha(id: SignId, u: number, v: number) {
  const vol = getSignVolume(id);
  if (!vol) return 0;
  const uu = Math.min(1, Math.max(0, u));
  const vv = Math.min(1, Math.max(0, v));
  return sampleField(vol.alpha, vol, uu, vv);
}

export function volumeChest(id: SignId) {
  const vol = getSignVolume(id);
  if (!vol || !vol.stars.length) return { x: 0, y: 0.06 };
  let cx = 0;
  let cy = 0;
  let w = 0;
  const n = Math.min(vol.stars.length, 80);
  for (let i = 0; i < n; i++) {
    const s = vol.stars[i]!;
    const m = 0.4 + s.mag;
    cx += s.x * m;
    cy += s.y * m;
    w += m;
  }
  if (w < 0.001) return { x: 0, y: 0.06 };
  return { x: cx / w, y: cy / w };
}
export function getSignVolume(id: SignId): SignVolume | null {
  const hit = volumes.get(id);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const img = signArtImage(id);
  if (!img.complete || (img.naturalWidth ?? 0) < 2) return null;
  const vol = build(id, img);
  volumes.set(id, vol);
  return vol;
}

export function primeSignVolumes() {
  (Object.keys(SIGN_ART) as SignId[]).forEach((id) => getSignVolume(id));
}

function sampleField(field: Float32Array, vol: SignVolume, u: number, v: number) {
  const x = Math.min(vol.cols - 1.001, Math.max(0, u * (vol.cols - 1)));
  const y = Math.min(vol.rows - 1.001, Math.max(0, (1 - v) * (vol.rows - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const i00 = y0 * vol.cols + x0;
  const i10 = y0 * vol.cols + Math.min(vol.cols - 1, x0 + 1);
  const i01 = Math.min(vol.rows - 1, y0 + 1) * vol.cols + x0;
  const i11 = Math.min(vol.rows - 1, y0 + 1) * vol.cols + Math.min(vol.cols - 1, x0 + 1);
  const a = field[i00]! * (1 - tx) + field[i10]! * tx;
  const b = field[i01]! * (1 - tx) + field[i11]! * tx;
  return a * (1 - ty) + b * ty;
}

/** Fill a cloud to `count` from the silhouette so a station can hold thousands of points. */
export function denseCloud(id: SignId, count: number): VolumeStar[] {
  const vol = getSignVolume(id);
  const src = vol?.stars;
  if (!src || !src.length) return [];
  const n = Math.max(1, Math.floor(count));
  const out: VolumeStar[] = new Array(n);
  const m = src.length;
  for (let i = 0; i < n; i++) {
    const a = src[i % m]!;
    const b = src[(i * 7 + 3) % m]!;
    const u = hash(i + 101);
    const jx = hash(i * 3 + 4) - 0.5;
    const jy = hash(i * 5 + 6) - 0.5;
    const jz = hash(i * 9 + 2) - 0.5;
    out[i] = {
      x: a.x + (b.x - a.x) * u * 0.18 + jx * 0.028,
      y: a.y + (b.y - a.y) * u * 0.18 + jy * 0.028,
      z: a.z + (b.z - a.z) * u * 0.22 + jz * 0.08,
      mag: Math.min(1, a.mag * (0.72 + hash(i + 21) * 0.4)),
    };
  }
  return out;
}

/** Pooled morph clouds — avoids mid-flight `denseCloud` hitch (A7). */
const cloudPool = new Map<string, VolumeStar[]>();

export function denseCloudPooled(id: SignId, count: number): VolumeStar[] {
  const key = `${id}:${Math.floor(count)}`;
  const hit = cloudPool.get(key);
  if (hit) return hit;
  const cloud = denseCloud(id, count);
  if (cloud.length) cloudPool.set(key, cloud);
  return cloud;
}

export function prebakeSignClouds(ids: SignId[], count: number) {
  for (const id of ids) denseCloudPooled(id, count);
}
