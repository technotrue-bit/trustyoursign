/**
 * Distant nebula wallpaper for the empty sky behind the Gemini card.
 * Decoration only — never interactive. Used by FallbackSky (2D) and
 * NebulaBackdrop (WebGL planes).
 */

export type NebulaLayerSpec = {
  /** Base filename under /sky/ (without size suffix). */
  id: string;
  /** Horizontal bias (−0.5 left … +0.5 right) as a fraction of canvas. */
  ox: number;
  /** Vertical bias (−0.5 up … +0.5 down). */
  oy: number;
  /** Cover scale (>1 zooms in). */
  scale: number;
  /** Peak opacity (edges stay vivid; center is vignetted separately). */
  opacity: number;
  /** Slow drift radians-per-second coefficient on shaderTime. */
  drift: number;
};

/**
 * Five compressed refs — corners/edges glow; center stays quieter via the edge
 * alpha mask (WebGL) / vignette (2D). Colour comes from the texture, so these
 * opacities can sit low without graying the sky out.
 */
export const NEBULA_LAYERS: readonly NebulaLayerSpec[] = [
  { id: "nebula-amber", ox: -0.18, oy: -0.12, scale: 1.42, opacity: 0.72, drift: 0.012 },
  { id: "nebula-butterfly", ox: 0.22, oy: -0.18, scale: 1.28, opacity: 0.68, drift: -0.01 },
  { id: "nebula-ring", ox: 0.05, oy: 0.2, scale: 1.18, opacity: 0.58, drift: 0.008 },
  { id: "nebula-hourglass", ox: -0.28, oy: 0.16, scale: 1.22, opacity: 0.62, drift: -0.014 },
  { id: "nebula-pillar", ox: 0.3, oy: 0.1, scale: 1.3, opacity: 0.66, drift: 0.009 },
] as const;

/** Mild tone-map multiplier on the WebGL planes: pulls mids down, keeps warmth. */
export const NEBULA_TINT = "#b8ab98";

/** Per-path gain on `NEBULA_LAYERS[*].opacity`. */
export const NEBULA_GL_LAYER_GAIN = 0.8;
export const NEBULA_GL_LAYER_GAIN_MODEST = 0.68;
export const NEBULA_2D_LAYER_GAIN = 0.6;

/** Edge alpha mask: how much of each plane survives at dead centre. */
export const EDGE_MASK_CENTER_ALPHA = 0.12;

/**
 * Dark elliptical well behind the figure + text column. `rx` / `ry` are
 * half-axes as a fraction of the well plane (taller than wide for phones).
 */
export const CENTER_WELL = { rx: 0.42, ry: 0.55, alpha: 0.82, color: "#0a0908" } as const;

/** Default 2D vignette strength — lands on the same charcoal as the WebGL well. */
export const CENTER_VIGNETTE_STRENGTH = 1.0;

export function nebulaUrl(id: string, modest: boolean): string {
  return modest ? `/sky/${id}-sm.jpg` : `/sky/${id}.jpg`;
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep01(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Alpha of the edge mask at normalised radius `r` (0 = centre, 1 = edge
 * midpoint, ~1.41 = corner). Low in the middle, opaque past the edges.
 */
export function edgeMaskAlphaAt(r: number): number {
  const t = smoothstep01((clamp01(r) - 0.18) / 0.82);
  return EDGE_MASK_CENTER_ALPHA + (1 - EDGE_MASK_CENTER_ALPHA) * t;
}

/**
 * Alpha of the centre well at plane-space `(x, y)` in [-0.5, 0.5]. Peaks at
 * `CENTER_WELL.alpha`, fades to 0 on the ellipse boundary and beyond.
 */
export function centerWellAlphaAt(x: number, y: number): number {
  const d = Math.hypot(x / CENTER_WELL.rx, y / CENTER_WELL.ry);
  if (d >= 1) return 0;
  return CENTER_WELL.alpha * smoothstep01(1 - d);
}

/** Grayscale RGBA pixels for a square edge-alpha mask (three reads the green channel). */
export function makeEdgeAlphaMaskData(size: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - half) / half;
      const ny = (y + 0.5 - half) / half;
      const a = Math.round(edgeMaskAlphaAt(Math.hypot(nx, ny)) * 255);
      const i = (y * size + x) * 4;
      data[i] = a;
      data[i + 1] = a;
      data[i + 2] = a;
      data[i + 3] = 255;
    }
  }
  return data;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** RGBA pixels for the centre well: `CENTER_WELL.color` with elliptical alpha. */
export function makeCenterWellData(size: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const [r, g, b] = hexToRgb(CENTER_WELL.color);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / size - 0.5;
      const py = (y + 0.5) / size - 0.5;
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.round(centerWellAlphaAt(px, py) * 255);
    }
  }
  return data;
}

/** Soft center darken so parchment card type stays readable; edges stay vivid. */
export function paintCenterVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength = CENTER_VIGNETTE_STRENGTH,
) {
  const cx = w * 0.5;
  const cy = h * 0.42;
  const r = Math.max(w, h) * 0.62;
  const g = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.18, cx, cy, r);
  g.addColorStop(0, `rgba(8, 7, 6, ${0.84 * strength})`);
  g.addColorStop(0.45, `rgba(8, 7, 6, ${0.4 * strength})`);
  g.addColorStop(0.78, `rgba(8, 7, 6, ${0.1 * strength})`);
  g.addColorStop(1, "rgba(8, 7, 6, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draw cover-fit image centered on (cx, cy) with uniform scale so the shorter
 * canvas edge is filled at `scale === 1`.
 */
export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  cx: number,
  cy: number,
  canvasW: number,
  canvasH: number,
  scale: number,
  opacity: number,
) {
  const iw = "naturalWidth" in img ? Number(img.naturalWidth) || 1 : 1;
  const ih = "naturalHeight" in img ? Number(img.naturalHeight) || 1 : 1;
  const cover = Math.max(canvasW / iw, canvasH / ih) * scale;
  const dw = iw * cover;
  const dh = ih * cover;
  ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.globalAlpha = 1;
}

export type NebulaImageMap = Map<string, HTMLImageElement>;

/** Prefetch wallpaper images; resolves when at least one layer is ready. */
export function loadNebulaImages(modest: boolean): Promise<NebulaImageMap> {
  const map: NebulaImageMap = new Map();
  const jobs = NEBULA_LAYERS.map(
    (layer) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          map.set(layer.id, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = nebulaUrl(layer.id, modest);
      }),
  );
  return Promise.all(jobs).then(() => map);
}

/**
 * Paint vibrant nebula wallpaper with slow drift. Uses `skyTime` so Pause freezes
 * motion with the rest of the sky. `lookX` / `lookY` add a tiny parallax while
 * the visitor drags to look around.
 */
export function paintNebulaWallpaper(
  ctx: CanvasRenderingContext2D,
  images: NebulaImageMap,
  w: number,
  h: number,
  skyTime: number,
  lookX = 0,
  lookY = 0,
) {
  if (images.size === 0 || w < 2 || h < 2) return;
  ctx.save();
  for (const layer of NEBULA_LAYERS) {
    const img = images.get(layer.id);
    if (!img) continue;
    const drift = skyTime * layer.drift;
    const cx =
      w * (0.5 + layer.ox) + Math.sin(drift) * w * 0.035 + lookX * w * 0.04;
    const cy =
      h * (0.5 + layer.oy) + Math.cos(drift * 0.85) * h * 0.028 - lookY * h * 0.035;
    drawCoverImage(ctx, img, cx, cy, w, h, layer.scale, layer.opacity * NEBULA_2D_LAYER_GAIN);
  }
  ctx.restore();
  paintCenterVignette(ctx, w, h, CENTER_VIGNETTE_STRENGTH);
}
