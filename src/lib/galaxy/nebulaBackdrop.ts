/**
 * Distant nebula wallpaper for the empty sky behind the Gemini card.
 * Decoration only — never interactive. Used by FallbackSky (2D) and
 * NebulaBackdrop (WebGL sky sphere).
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
  /** Peak opacity (soft plate edges die to black before the JPG rectangle). */
  opacity: number;
  /** Slow drift radians-per-second coefficient on shaderTime. */
  drift: number;
};

/**
 * Five compressed refs — corners/edges glow; centre stays quieter via the
 * centre well (WebGL) / vignette (2D). Soft plate falloff kills photo rims.
 * Scales and offsets are large/overlapping so the bake reads as one sky.
 */
export const NEBULA_LAYERS: readonly NebulaLayerSpec[] = [
  { id: "nebula-amber", ox: -0.26, oy: -0.18, scale: 1.72, opacity: 0.72, drift: 0.012 },
  { id: "nebula-butterfly", ox: 0.28, oy: -0.22, scale: 1.64, opacity: 0.68, drift: -0.01 },
  { id: "nebula-ring", ox: 0.02, oy: 0.24, scale: 1.58, opacity: 0.58, drift: 0.008 },
  { id: "nebula-hourglass", ox: -0.34, oy: 0.2, scale: 1.66, opacity: 0.62, drift: -0.014 },
  { id: "nebula-pillar", ox: 0.36, oy: 0.12, scale: 1.7, opacity: 0.66, drift: 0.009 },
] as const;

/** Mild tone-map multiplier on the wallpaper: pulls mids down, keeps warmth. */
export const NEBULA_TINT = "#b8ab98";

/** Per-path gain on `NEBULA_LAYERS[*].opacity`. */
export const NEBULA_GL_LAYER_GAIN = 0.8;
export const NEBULA_GL_LAYER_GAIN_MODEST = 0.68;
export const NEBULA_2D_LAYER_GAIN = 0.6;

/**
 * Soft centre darkening on the baked sky (multiplied into RGB, not a hard
 * alpha frame). High enough that the middle stays nebula; the radial well
 * does the extra dimming for type.
 */
export const EDGE_MASK_CENTER_ALPHA = 0.78;

/**
 * Soft elliptical well behind the figure + text column. `rx` / `ry` are
 * half-axes as a fraction of the well plane (taller than wide for phones).
 * Alpha is a veil — a hard near-black disc read as a vertical crack.
 */
export const CENTER_WELL = { rx: 0.34, ry: 0.44, alpha: 0.34, color: "#0a0908" } as const;

/** Default 2D vignette strength — lands on the same charcoal as the WebGL well. */
export const CENTER_VIGNETTE_STRENGTH = 1.0;

/** Baked wallpaper side length — one texture wraps the sky sphere. */
export const NEBULA_COMPOSITE_SIZE = 1536;
export const NEBULA_COMPOSITE_SIZE_MODEST = 1024;

/**
 * Whole-sky drift after baking (mean of the five layer drifts). Per-layer
 * parallax is intentionally collapsed so we pay one draw instead of five.
 */
export const NEBULA_COMPOSITE_DRIFT =
  NEBULA_LAYERS.reduce((acc, l) => acc + l.drift, 0) / NEBULA_LAYERS.length;

/** How far from the plate centre soft falloff begins (0–1 half-extent). */
export const PLATE_FADE_START = 0.52;
/** Half-extent where plate alpha hits 0 — before the JPG rectangle rim. */
export const PLATE_FADE_END = 0.98;

export function nebulaCompositeSize(modest: boolean): number {
  return modest ? NEBULA_COMPOSITE_SIZE_MODEST : NEBULA_COMPOSITE_SIZE;
}

/**
 * Kept live in the chunk. A missed `/assets` file used to be cached as
 * immutable for a year, so browsers that stored that 404 never retry the
 * same URL. This string moves the content hash without changing the plates.
 */
const NEBULA_CHUNK_REV = "2";

export function nebulaUrl(id: string, modest: boolean): string {
  const file = modest ? `${id}-sm.jpg` : `${id}.jpg`;
  return `/sky/${file}${id ? "" : NEBULA_CHUNK_REV}`;
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep01(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Soft plate edge at normalised half-extents `nx`/`ny` in [-1, 1] (0 = centre
 * of the drawn JPG, ±1 = rectangle rim). Returns 1 in the core and 0 before
 * the rim so no photo cutout can read as a frame.
 */
export function plateEdgeAlphaAt(nx: number, ny: number): number {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const span = Math.max(1e-6, PLATE_FADE_END - PLATE_FADE_START);
  const fx = 1 - smoothstep01((ax - PLATE_FADE_START) / span);
  const fy = 1 - smoothstep01((ay - PLATE_FADE_START) / span);
  return fx * fy;
}

/**
 * Soft centre weight for exposure (0 = centre, 1 = edge midpoint). Low in the
 * middle so stacked plates do not white-out under the card; used as a multiply
 * factor, never as an opaque square frame.
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

/** Grayscale RGBA pixels for a square soft-centre multiply mask. */
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

/** Soft plate alpha mask sized to a drawn JPG rect (u/v in plate space). */
export function makePlateEdgeMaskData(size: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1;
      const a = Math.round(plateEdgeAlphaAt(nx, ny) * 255);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = a;
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
  g.addColorStop(0, `rgba(8, 7, 6, ${0.4 * strength})`);
  g.addColorStop(0.45, `rgba(8, 7, 6, ${0.18 * strength})`);
  g.addColorStop(0.78, `rgba(8, 7, 6, ${0.05 * strength})`);
  g.addColorStop(1, "rgba(8, 7, 6, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draw cover-fit image centered on (cx, cy) with uniform scale so the shorter
 * canvas edge is filled at `scale === 1`.
 */
function imageSize(img: CanvasImageSource): [number, number] {
  if ("naturalWidth" in img) {
    const w = Number(img.naturalWidth) || 0;
    const h = Number(img.naturalHeight) || 0;
    if (w > 0 && h > 0) return [w, h];
  }
  if ("width" in img && "height" in img) {
    const w = Number(img.width) || 1;
    const h = Number(img.height) || 1;
    return [w, h];
  }
  return [1, 1];
}

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
  const [iw, ih] = imageSize(img);
  const cover = Math.max(canvasW / iw, canvasH / ih) * scale;
  const dw = iw * cover;
  const dh = ih * cover;
  ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.globalAlpha = 1;
}

/**
 * Draw one JPG as a soft plate: cover-fit, then multiply by a plate-edge mask
 * so alpha dies to 0 before the rectangle rim. Overlapped plates blend; no
 * photo frames remain.
 */
export function drawSoftPlate(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  cx: number,
  cy: number,
  canvasW: number,
  canvasH: number,
  scale: number,
  opacity: number,
  plateMask: CanvasImageSource,
) {
  const [iw, ih] = imageSize(img);
  const cover = Math.max(canvasW / iw, canvasH / ih) * scale;
  const dw = Math.max(2, Math.ceil(iw * cover));
  const dh = Math.max(2, Math.ceil(ih * cover));
  const plate = document.createElement("canvas");
  plate.width = dw;
  plate.height = dh;
  const pctx = plate.getContext("2d", { alpha: true });
  if (!pctx) return;
  pctx.clearRect(0, 0, dw, dh);
  pctx.drawImage(img, 0, 0, dw, dh);
  pctx.globalCompositeOperation = "destination-in";
  pctx.drawImage(plateMask, 0, 0, dw, dh);
  pctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
  ctx.drawImage(plate, cx - dw / 2, cy - dh / 2);
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
 * Bake the five layer JPGs into one soft-edged sky canvas: each plate dies to
 * transparent before its rectangle, layers overlap heavily, then a warm tint
 * and a soft centre multiply (not an opaque square frame) keep exposure tame.
 * Returns null when nothing is ready yet.
 */
export function composeNebulaWallpaper(
  images: NebulaImageMap,
  size: number,
  gain = NEBULA_2D_LAYER_GAIN,
): HTMLCanvasElement | null {
  if (typeof document === "undefined" || images.size === 0 || size < 2) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  // Opaque charcoal underlay so soft plate rims blend into sky, not empty UV holes.
  ctx.fillStyle = "#0c0a09";
  ctx.fillRect(0, 0, size, size);

  const maskSize = 256;
  const plateMaskCanvas = document.createElement("canvas");
  plateMaskCanvas.width = maskSize;
  plateMaskCanvas.height = maskSize;
  const mctx = plateMaskCanvas.getContext("2d");
  if (!mctx) return null;
  const plateMask = makePlateEdgeMaskData(maskSize);
  const plateImg = mctx.createImageData(maskSize, maskSize);
  plateImg.data.set(plateMask);
  mctx.putImageData(plateImg, 0, 0);

  // Wrap-around copies so sphere UVs never land on an empty strip (no black gutter).
  const wrapOffsets: readonly [number, number][] = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let painted = 0;

  // Left and right washes cross the canvas centre so the one sky plate
  // has nebula behind the figure, not a dark gap between two side cards.
  const washLeft = NEBULA_LAYERS[0];
  const washRight = NEBULA_LAYERS[1];
  const washLeftImg = washLeft ? images.get(washLeft.id) : undefined;
  const washRightImg = washRight ? images.get(washRight.id) : undefined;
  if (washLeft && washLeftImg) {
    drawSoftPlate(
      ctx,
      washLeftImg,
      size * 0.46,
      size * 0.48,
      size,
      size,
      2.75,
      washLeft.opacity * gain * 0.58,
      plateMaskCanvas,
    );
    painted++;
  }
  if (washRight && washRightImg) {
    drawSoftPlate(
      ctx,
      washRightImg,
      size * 0.54,
      size * 0.5,
      size,
      size,
      2.75,
      washRight.opacity * gain * 0.58,
      plateMaskCanvas,
    );
    painted++;
  }
  for (const layer of NEBULA_LAYERS) {
    const img = images.get(layer.id);
    if (!img) continue;
    for (const [wx, wy] of wrapOffsets) {
      const fade =
        wx === 0 && wy === 0 ? 1 : wx === 0 || wy === 0 ? 0.55 : 0.32;
      drawSoftPlate(
        ctx,
        img,
        size * (0.5 + layer.ox + wx),
        size * (0.5 + layer.oy + wy),
        size,
        size,
        layer.scale,
        layer.opacity * gain * fade,
        plateMaskCanvas,
      );
    }
    painted++;
  }
  if (painted === 0) return null;

  // Warm mid tone-map (matches former MeshBasicMaterial `color={NEBULA_TINT}`).
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = NEBULA_TINT;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  // Soft centre darken via multiply — edges stay vivid, no opaque square frame.
  const centre = document.createElement("canvas");
  centre.width = size;
  centre.height = size;
  const cctx = centre.getContext("2d");
  if (cctx) {
    const mask = makeEdgeAlphaMaskData(size);
    const imgData = cctx.createImageData(size, size);
    for (let i = 0; i < mask.length; i += 4) {
      const v = mask[i]!;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    cctx.putImageData(imgData, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(centre, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }

  // Soft rim on the final canvas — alpha dies before the square border so a
  // plate edge can never read as a picture frame if it grazes the frustum.
  const rim = document.createElement("canvas");
  rim.width = size;
  rim.height = size;
  const rctx = rim.getContext("2d");
  if (rctx) {
    const imgData = rctx.createImageData(size, size);
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = Math.abs((x + 0.5 - half) / half);
        const ny = Math.abs((y + 0.5 - half) / half);
        const m = Math.max(nx, ny);
        const a = Math.round((1 - smoothstep01((m - 0.9) / 0.1)) * 255);
        const i = (y * size + x) * 4;
        imgData.data[i] = 255;
        imgData.data[i + 1] = 255;
        imgData.data[i + 2] = 255;
        imgData.data[i + 3] = a;
      }
    }
    rctx.putImageData(imgData, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(rim, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }
  return canvas;
}

/**
 * Paint the baked wallpaper with whole-sky drift. Uses `skyTime` so Pause
 * freezes motion. `lookX` / `lookY` add a tiny parallax while looking around.
 * Cover scale is oversized so the 2D path never shows a billboard rim.
 */
export function paintNebulaWallpaper(
  ctx: CanvasRenderingContext2D,
  images: NebulaImageMap,
  w: number,
  h: number,
  skyTime: number,
  lookX = 0,
  lookY = 0,
  composite: HTMLCanvasElement | null = null,
) {
  if (w < 2 || h < 2) return;
  const baked =
    composite ??
    composeNebulaWallpaper(images, Math.min(1024, Math.max(w, h)), NEBULA_2D_LAYER_GAIN);
  if (!baked) return;
  const drift = skyTime * NEBULA_COMPOSITE_DRIFT;
  const cx = w * 0.5 + Math.sin(drift) * w * 0.035 + lookX * w * 0.04;
  const cy = h * 0.5 + Math.cos(drift * 0.85) * h * 0.028 - lookY * h * 0.035;
  ctx.save();
  drawCoverImage(ctx, baked, cx, cy, w, h, 1.55, 1);
  ctx.restore();
  paintCenterVignette(ctx, w, h, CENTER_VIGNETTE_STRENGTH);
}
