import { BufferAttribute, BufferGeometry } from "three";
import type { SignId } from "@/lib/chart/types";
import { isSmallGpu } from "@/lib/gpu";
import { SIGN_ART, signArtImage } from "./signArt";

/** Live vault stations use the painted plate. Opt into volume via mesh review (`/?mesh=…`). */
export const VOLUME_SIGN_IDS: ReadonlySet<SignId> = new Set();

export function hasVolumeSign(id: SignId) {
  return VOLUME_SIGN_IDS.has(id);
}

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

function noteBootVolumeBuild() {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const w = window as Window & { __tysBoot?: { volumeBuilds: number; morphFills: number } };
  if (!w.__tysBoot) w.__tysBoot = { volumeBuilds: 0, morphFills: 0 };
  w.__tysBoot.volumeBuilds = volumes.size;
}
const SMALL = typeof window !== "undefined" && isSmallGpu();
const COLS = SMALL ? 52 : 72;
const ROWS = SMALL ? 30 : 42;
const STAR_CAP = SMALL ? 480 : 860;
/**
 * Depth factor ranges (see `depthFactor`) — each spans up to 1.0 so the
 * product's theoretical ceiling is exactly 1.0, keeping `MAX_DEPTH_FACTOR`
 * an honest bound rather than an unreachable worst case.
 */
const EDGE_MIN = 0.5;
const EDGE_SPAN = 0.5;
const BODY_MIN = 0.6;
const BODY_SPAN = 0.4;
/** Worst-case (edge=1, body=1) value of `depthFactor` — used to bound DEPTH_SCALE. */
export const MAX_DEPTH_FACTOR = (EDGE_MIN + EDGE_SPAN) * (BODY_MIN + BODY_SPAN);
/**
 * Scales relief depth so half-thickness reads ~0.22–0.35 in unit plate space
 * on real sign art (measured on sagittarius.png: ~0.23 at full 72×42 grid,
 * ~0.28 at the small-GPU 52×30 grid). `MAX_DEPTH_FACTOR * DEPTH_SCALE` must
 * stay ≤ 0.35 — see signVolume.test.ts.
 */
export const DEPTH_SCALE = 0.35;
const ALPHA_CUT = 0.06;

/** Relief depth multiplier from silhouette-edge distance and pixel luma, both 0–1. */
export function depthFactor(edge: number, body: number): number {
  return (EDGE_MIN + edge * EDGE_SPAN) * (BODY_MIN + body * BODY_SPAN);
}

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
      const z = depthFactor(edge, body) * DEPTH_SCALE;
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
  noteBootVolumeBuild();
  return vol;
}

export function primeSignVolumes() {
  (Object.keys(SIGN_ART) as SignId[]).forEach((id) => getSignVolume(id));
}

/** Warm relief bakes for aimed station ±1 — same corridor window as plate prefetch. */
export function primeSignVolumeNear(index: number) {
  if (typeof document === "undefined") return;
  const ids = Object.keys(SIGN_ART) as SignId[];
  const n = ids.length;
  const i = ((index % n) + n) % n;
  for (const j of [i - 1, i, i + 1]) {
    if (j < 0 || j >= n) continue;
    getSignVolume(ids[j]!);
  }
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

function gridXY(cols: number, rows: number, cx: number, cy: number) {
  return {
    x: cx / (cols - 1) - 0.5,
    y: 0.5 - cy / (rows - 1),
    u: cx / (cols - 1),
    v: 1 - cy / (rows - 1),
  };
}

function cellOpaque(alpha: Float32Array, cols: number, rows: number, cx: number, cy: number) {
  if (cx < 0 || cy < 0 || cx >= cols - 1 || cy >= rows - 1) return false;
  const i00 = cy * cols + cx;
  const i10 = cy * cols + cx + 1;
  const i01 = (cy + 1) * cols + cx;
  const i11 = (cy + 1) * cols + cx + 1;
  return (
    alpha[i00]! > ALPHA_CUT ||
    alpha[i10]! > ALPHA_CUT ||
    alpha[i01]! > ALPHA_CUT ||
    alpha[i11]! > ALPHA_CUT
  );
}

/** Closed front/back shell with rim quads from a baked sign volume. */
export function buildShellGeometryFromVolume(vol: SignVolume): BufferGeometry {
  const { cols, rows, alpha, depth } = vol;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const vertCount = cols * rows;
  const frontBase = 0;
  const backBase = vertCount;

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = cy * cols + cx;
      const { x, y, u, v } = gridXY(cols, rows, cx, cy);
      const d = alpha[i]! > ALPHA_CUT ? depth[i]! : 0;
      positions.push(x, y, d);
      uvs.push(u, v);
      positions.push(x, y, -d);
      uvs.push(1 - u, v);
    }
  }

  const pushQuad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d);
  };

  for (let cy = 0; cy < rows - 1; cy++) {
    for (let cx = 0; cx < cols - 1; cx++) {
      if (!cellOpaque(alpha, cols, rows, cx, cy)) continue;
      const i00 = cy * cols + cx;
      const i10 = cy * cols + cx + 1;
      const i01 = (cy + 1) * cols + cx;
      const i11 = (cy + 1) * cols + cx + 1;
      pushQuad(
        frontBase + i00,
        frontBase + i10,
        frontBase + i11,
        frontBase + i01,
      );
      pushQuad(
        backBase + i00,
        backBase + i01,
        backBase + i11,
        backBase + i10,
      );
    }
  }

  for (let cy = 0; cy < rows - 1; cy++) {
    for (let cx = 0; cx < cols - 1; cx++) {
      const left = cellOpaque(alpha, cols, rows, cx - 1, cy);
      const right = cellOpaque(alpha, cols, rows, cx, cy);
      if (left === right) continue;
      const vx = cx;
      const v0 = cy * cols + vx;
      const v1 = (cy + 1) * cols + vx;
      if (right) {
        pushQuad(frontBase + v0, frontBase + v1, backBase + v1, backBase + v0);
      } else {
        pushQuad(frontBase + v1, frontBase + v0, backBase + v0, backBase + v1);
      }
    }
  }

  for (let cy = 0; cy < rows - 1; cy++) {
    for (let cx = 0; cx < cols - 1; cx++) {
      const top = cellOpaque(alpha, cols, rows, cx, cy - 1);
      const bottom = cellOpaque(alpha, cols, rows, cx, cy);
      if (top === bottom) continue;
      const vy = cy;
      const v0 = vy * cols + cx;
      const v1 = vy * cols + cx + 1;
      if (bottom) {
        pushQuad(frontBase + v0, frontBase + v1, backBase + v1, backBase + v0);
      } else {
        pushQuad(frontBase + v1, frontBase + v0, backBase + v0, backBase + v1);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildShellGeometry(id: SignId): BufferGeometry | null {
  const vol = getSignVolume(id);
  if (!vol) return null;
  return buildShellGeometryFromVolume(vol);
}

/** Rejection-sample interior points through ±Z inside the volume body. */
export function interiorCloudFromVolume(vol: SignVolume, count: number): VolumeStar[] {
  const n = Math.max(1, Math.floor(count));
  const out: VolumeStar[] = new Array(n);
  const { cols, rows, alpha, depth } = vol;
  const cells: number[] = [];
  for (let cy = 0; cy < rows - 1; cy++) {
    for (let cx = 0; cx < cols - 1; cx++) {
      if (!cellOpaque(alpha, cols, rows, cx, cy)) continue;
      cells.push(cy * cols + cx);
    }
  }
  if (!cells.length) {
    for (let i = 0; i < n; i++) out[i] = { x: 0, y: 0, z: 0, mag: 0 };
    return out;
  }
  for (let i = 0; i < n; i++) {
    const seed = i * 17 + 3;
    const cell = cells[Math.floor(hash(seed) * cells.length)]!;
    const cx = cell % cols;
    const cy = Math.floor(cell / cols);
    const jx = hash(seed + 1);
    const jy = hash(seed + 2);
    const jz = hash(seed + 3);
    const x = (cx + jx) / (cols - 1) - 0.5;
    const y = 0.5 - (cy + jy) / (rows - 1);
    const idx = Math.min(cols * rows - 1, cy * cols + cx);
    const d = depth[idx]! > 0 ? depth[idx]! : 0.1;
    const z = (jz * 2 - 1) * d;
    const a = alpha[idx] ?? 0;
    out[i] = {
      x,
      y,
      z,
      mag: Math.min(1, 0.25 + a * 0.5 + d * 0.35),
    };
  }
  return out;
}

export function interiorCloud(id: SignId, count: number): VolumeStar[] {
  const vol = getSignVolume(id);
  if (!vol) return [];
  return interiorCloudFromVolume(vol, count);
}

/** Push a unit plane into the sign's body so it reads as sculpture, not a card. */
export function sculptRelief(geo: BufferGeometry, vol: SignVolume) {
  const pos = geo.getAttribute("position") as BufferAttribute;
  const uv = geo.getAttribute("uv") as BufferAttribute;
  if (!pos || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const a = sampleField(vol.alpha, vol, u, v);
    const d = sampleField(vol.depth, vol, u, v);
    pos.setZ(i, a > 0.06 ? d : 0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}
