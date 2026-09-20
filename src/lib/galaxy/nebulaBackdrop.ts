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

/** Five compressed refs — corners/edges glow; center stays quieter via vignette. */
export const NEBULA_LAYERS: readonly NebulaLayerSpec[] = [
  { id: "nebula-amber", ox: -0.18, oy: -0.12, scale: 1.42, opacity: 0.92, drift: 0.012 },
  { id: "nebula-butterfly", ox: 0.22, oy: -0.18, scale: 1.28, opacity: 0.88, drift: -0.01 },
  { id: "nebula-ring", ox: 0.05, oy: 0.2, scale: 1.18, opacity: 0.7, drift: 0.008 },
  { id: "nebula-hourglass", ox: -0.28, oy: 0.16, scale: 1.22, opacity: 0.78, drift: -0.014 },
  { id: "nebula-pillar", ox: 0.3, oy: 0.1, scale: 1.3, opacity: 0.82, drift: 0.009 },
] as const;

export function nebulaUrl(id: string, modest: boolean): string {
  return modest ? `/sky/${id}-sm.jpg` : `/sky/${id}.jpg`;
}

/** Soft center darken so parchment card type stays readable; edges stay vivid. */
export function paintCenterVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength = 0.7,
) {
  const cx = w * 0.5;
  const cy = h * 0.42;
  const r = Math.max(w, h) * 0.62;
  const g = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.12, cx, cy, r);
  g.addColorStop(0, `rgba(8, 7, 6, ${0.78 * strength})`);
  g.addColorStop(0.45, `rgba(8, 7, 6, ${0.32 * strength})`);
  g.addColorStop(0.78, `rgba(8, 7, 6, ${0.08 * strength})`);
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
    drawCoverImage(ctx, img, cx, cy, w, h, layer.scale, layer.opacity * 0.82);
  }
  ctx.restore();
  paintCenterVignette(ctx, w, h, 0.72);
}
