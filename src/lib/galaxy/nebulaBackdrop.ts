/**
 * Distant nebula wallpaper for the empty sky behind the Gemini card.
 * Decoration only — never interactive. Used by FallbackSky (2D) and
 * NebulaBackdrop (WebGL sky sphere).
 */

export type NebulaLayerSpec = {
  /** Base filename under /sky/ (without size suffix). */
  id: string;
  /** Peak opacity (soft plate edges die to black before the JPG rectangle). */
  opacity: number;
  /** Slow drift radians-per-second coefficient on shaderTime. */
  drift: number;
};

/**
 * Five compressed refs. Where each one lands is `NEBULA_PLACEMENTS`; this is
 * only what to load and how bright it may burn.
 */
export const NEBULA_LAYERS: readonly NebulaLayerSpec[] = [
  { id: "nebula-amber", opacity: 0.72, drift: 0.012 },
  { id: "nebula-butterfly", opacity: 0.68, drift: -0.01 },
  { id: "nebula-ring", opacity: 0.58, drift: 0.008 },
  { id: "nebula-hourglass", opacity: 0.62, drift: -0.014 },
  { id: "nebula-pillar", opacity: 0.66, drift: 0.009 },
] as const;

/**
 * Where each ref lands on the bake. `span` is the drawn long edge as a
 * fraction of the square canvas: the refs are 635–1024 px, so spans near 0.5
 * keep the draw at roughly source resolution instead of the 4× cover-fit
 * blow-up that turned dust into haze.
 *
 * `crop` takes a sub-rect of the source (fractions of width/height). The two
 * showpiece objects — the ring and the hourglass — are unmistakable, so each
 * appears exactly once, small, out at a corner; everything else is cut from
 * the amorphous dust of the other three so the sky never reads as one photo
 * tiled. Corners carry the structure, the middle band stays quiet so type
 * over it still reads.
 */
export type NebulaPlacement = {
  /** Index into `NEBULA_LAYERS`. */
  layer: number;
  /** Centre in canvas fractions (may sit slightly outside to bleed off-edge). */
  cx: number;
  cy: number;
  /** Drawn long edge as a fraction of the canvas side. */
  span: number;
  /** Multiplier on the layer opacity for this placement. */
  weight: number;
  /** Source sub-rect `[x, y, w, h]` in fractions of the image. */
  crop?: readonly [number, number, number, number];
  /** Radians of in-plane rotation. */
  rot?: number;
  /** Mirror horizontally. */
  flip?: boolean;
};

const AMBER = 0;
const BUTTERFLY = 1;
const RING = 2;
const HOURGLASS = 3;
const PILLAR = 4;

export const NEBULA_PLACEMENTS: readonly NebulaPlacement[] = [
  // A laptop window sees the middle band of the square plate, so its four
  // corners land here — not at the canvas corners.
  { layer: AMBER, cx: 0.13, cy: 0.3, span: 0.56, weight: 0.95, crop: [0, 0.24, 0.62, 0.56], rot: -0.16 },
  { layer: PILLAR, cx: 0.87, cy: 0.31, span: 0.56, weight: 0.88, rot: 0.2, flip: true },
  { layer: PILLAR, cx: 0.13, cy: 0.7, span: 0.54, weight: 0.86, crop: [0, 0.3, 0.58, 0.55], rot: -0.52 },
  { layer: AMBER, cx: 0.87, cy: 0.7, span: 0.56, weight: 0.9, crop: [0.3, 0.4, 0.7, 0.6], rot: 0.34, flip: true },
  // A phone sees the middle column instead — same treatment, its own corners.
  { layer: AMBER, cx: 0.34, cy: 0.11, span: 0.5, weight: 0.8, crop: [0.4, 0, 0.6, 0.5], rot: 0.12 },
  { layer: PILLAR, cx: 0.66, cy: 0.12, span: 0.5, weight: 0.78, crop: [0.3, 0, 0.5, 0.45], rot: 0.4, flip: true },
  { layer: PILLAR, cx: 0.33, cy: 0.89, span: 0.5, weight: 0.78, crop: [0.24, 0.45, 0.6, 0.55], rot: -0.22 },
  { layer: AMBER, cx: 0.67, cy: 0.88, span: 0.5, weight: 0.8, crop: [0, 0.5, 0.5, 0.5], rot: -0.7, flip: true },
  // One of each showpiece, small, parked where a corner will find it.
  { layer: RING, cx: 0.9, cy: 0.34, span: 0.26, weight: 0.72, rot: 0.1 },
  { layer: HOURGLASS, cx: 0.1, cy: 0.66, span: 0.22, weight: 0.6, rot: -0.24 },
  { layer: BUTTERFLY, cx: 0.62, cy: 0.86, span: 0.3, weight: 0.62, rot: 0.3, flip: true },
  // Edge midpoints tie the two frames together — no empty band between them.
  { layer: BUTTERFLY, cx: 0.05, cy: 0.5, span: 0.46, weight: 0.55, crop: [0, 0, 0.46, 0.46], rot: 0.72 },
  { layer: AMBER, cx: 0.95, cy: 0.5, span: 0.48, weight: 0.6, crop: [0, 0, 0.5, 0.45], rot: -0.88, flip: true },
  { layer: AMBER, cx: 0.5, cy: 0.05, span: 0.46, weight: 0.5, crop: [0.45, 0.5, 0.55, 0.5], rot: -0.5 },
  { layer: PILLAR, cx: 0.5, cy: 0.95, span: 0.46, weight: 0.5, crop: [0, 0.5, 0.5, 0.5], rot: -0.95, flip: true },
  // Canvas corners: cheap bleed so a square-ish window never runs out of sky.
  { layer: PILLAR, cx: 0.03, cy: 0.04, span: 0.4, weight: 0.45, crop: [0.5, 0, 0.5, 0.5], rot: 0.62 },
  { layer: AMBER, cx: 0.97, cy: 0.03, span: 0.4, weight: 0.45, crop: [0.1, 0.2, 0.6, 0.55], rot: 0.9 },
  { layer: AMBER, cx: 0.02, cy: 0.97, span: 0.4, weight: 0.45, crop: [0.45, 0.5, 0.55, 0.5], rot: 1.3 },
  { layer: BUTTERFLY, cx: 0.98, cy: 0.97, span: 0.4, weight: 0.45, crop: [0.5, 0.5, 0.5, 0.5], rot: -1.1 },
  // Mid field: real sky, just quieter, so the centre is not a hole.
  { layer: PILLAR, cx: 0.36, cy: 0.4, span: 0.46, weight: 0.34, crop: [0.3, 0, 0.5, 0.45], rot: 1.4 },
  { layer: AMBER, cx: 0.64, cy: 0.6, span: 0.48, weight: 0.32, crop: [0.1, 0.2, 0.6, 0.55], rot: -1.5, flip: true },
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

/**
 * How far from the plate centre soft falloff begins (0–1 half-extent). Kept
 * late: feathering from the middle of every plate is what smeared the refs
 * into fog. Two thirds of each plate stays at full strength; only the rim
 * ramps out, which is all it takes to hide a seam.
 */
export const PLATE_FADE_START = 0.66;
/** Half-extent where plate alpha hits 0 — before the JPG rectangle rim. */
export const PLATE_FADE_END = 0.99;

/**
 * Pinpoint stars painted into the bake. The refs are 635 px JPEGs, so their
 * own stars are already mush at sky scale; these are drawn as hard little
 * discs after the tint so they stay points instead of smudges. They live in
 * the composite, so they drift with the plate.
 */
export const STAR_FIELD = {
  /** Stars per 1024 px of bake side. */
  density: 620,
  /** Disc radius in bake pixels — faintest to brightest. */
  minRadius: 0.5,
  maxRadius: 1.45,
  /** Share of brightness left in the middle, where type sits. */
  centerDim: 0.3,
} as const;

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

/** Drawn pixel size of one placement on a `size` bake. */
export function placementSize(
  place: NebulaPlacement,
  imgW: number,
  imgH: number,
  size: number,
): [number, number] {
  const [, , cw = 1, ch = 1] = place.crop ?? [];
  const sw = Math.max(1, imgW * cw);
  const sh = Math.max(1, imgH * ch);
  const k = (place.span * size) / Math.max(sw, sh);
  return [Math.max(2, Math.round(sw * k)), Math.max(2, Math.round(sh * k))];
}

/**
 * Stamp one crop, feathered through `scratch` so its rectangle dies before
 * the rim. Additive: these refs are bright structure on black, so drawing
 * them `source-over` meant every plate dimmed the one under it — five of
 * those stacked is exactly the haze we are removing. Adding leaves the black
 * black and lets the dust lanes keep their edges.
 */
export function drawPlacement(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  plateMask: CanvasImageSource,
  scratch: HTMLCanvasElement,
  size: number,
  place: NebulaPlacement,
  opacity: number,
) {
  const [iw, ih] = imageSize(img);
  const [dw, dh] = placementSize(place, iw, ih, size);
  if (dw > scratch.width || dh > scratch.height) return;
  const sctx = scratch.getContext("2d", { alpha: true });
  if (!sctx) return;
  const [cx = 0, cy = 0, cw = 1, ch = 1] = place.crop ?? [];
  sctx.clearRect(0, 0, dw, dh);
  sctx.globalCompositeOperation = "source-over";
  sctx.drawImage(img, cx * iw, cy * ih, cw * iw, ch * ih, 0, 0, dw, dh);
  sctx.globalCompositeOperation = "destination-in";
  sctx.drawImage(plateMask, 0, 0, dw, dh);
  sctx.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp01(opacity);
  ctx.translate(place.cx * size, place.cy * size);
  if (place.rot) ctx.rotate(place.rot);
  if (place.flip) ctx.scale(-1, 1);
  ctx.drawImage(scratch, 0, 0, dw, dh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function starHash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Hard little discs, additively stamped. Radius stays around a pixel so the
 * sky reads as points, and the middle is dimmed so nothing competes with the
 * type. Deterministic, so the sky is the same every load.
 */
export function paintPinpointStars(ctx: CanvasRenderingContext2D, size: number) {
  const n = Math.round((STAR_FIELD.density * size) / 1024);
  const span = STAR_FIELD.maxRadius - STAR_FIELD.minRadius;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const x = starHash(i, 1) * size;
    const y = starHash(i, 2) * size;
    const nx = (x / size - 0.5) * 2;
    const ny = (y / size - 0.5) * 2;
    const field =
      STAR_FIELD.centerDim +
      (1 - STAR_FIELD.centerDim) * smoothstep01((Math.hypot(nx, ny) - 0.15) / 0.75);
    // Few bright, many faint — a flat distribution reads as noise.
    const mag = Math.pow(starHash(i, 3), 2.3);
    const r = STAR_FIELD.minRadius + mag * span;
    const alpha = clamp01((0.3 + mag * 0.7) * field);
    if (alpha < 0.02) continue;
    const hue = starHash(i, 4);
    const tint =
      hue < 0.16 ? "205, 218, 255" : hue < 0.3 ? "255, 226, 186" : "255, 247, 235";
    if (mag > 0.72) {
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4.2);
      halo.addColorStop(0, `rgba(${tint}, ${alpha * 0.34})`);
      halo.addColorStop(1, `rgba(${tint}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(${tint}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
 * Bake the five layer JPGs into one soft-edged sky canvas. Each ref is
 * feathered once at its own resolution and then stamped additively near that
 * resolution, so the dust keeps its edges; cover-fitting them 4× across the
 * canvas is what used to smear the sky into fog. Pinpoint stars go on after
 * the warm tint, then a soft centre multiply (not an opaque square frame)
 * keeps exposure tame. Returns null when nothing is ready yet.
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
  ctx.fillStyle = "#0a0908";
  ctx.fillRect(0, 0, size, size);

  const maskSize = 512;
  const plateMaskCanvas = document.createElement("canvas");
  plateMaskCanvas.width = maskSize;
  plateMaskCanvas.height = maskSize;
  const mctx = plateMaskCanvas.getContext("2d");
  if (!mctx) return null;
  const plateMask = makePlateEdgeMaskData(maskSize);
  const plateImg = mctx.createImageData(maskSize, maskSize);
  plateImg.data.set(plateMask);
  mctx.putImageData(plateImg, 0, 0);

  // One scratch buffer for every placement: the old bake allocated a canvas
  // per plate, each one 4× the ref, which is most of what made it hitch.
  const widest = NEBULA_PLACEMENTS.reduce((m, p) => Math.max(m, p.span), 0.5);
  const scratch = document.createElement("canvas");
  scratch.width = Math.ceil(widest * size);
  scratch.height = scratch.width;

  let painted = 0;
  for (const place of NEBULA_PLACEMENTS) {
    const layer = NEBULA_LAYERS[place.layer];
    const img = layer ? images.get(layer.id) : undefined;
    if (!layer || !img) continue;
    drawPlacement(
      ctx,
      img,
      plateMaskCanvas,
      scratch,
      size,
      place,
      layer.opacity * gain * place.weight,
    );
    painted++;
  }
  if (painted === 0) return null;

  // Warm mid tone-map (matches former MeshBasicMaterial `color={NEBULA_TINT}`).
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = NEBULA_TINT;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  paintPinpointStars(ctx, size);

  // Both masks are smooth ramps, so they are built small and scaled up: a
  // per-pixel loop at bake size is a visible hitch on a phone.
  const MASK_PX = 256;

  // Soft centre darken via multiply — edges stay vivid, no opaque square frame.
  const centre = document.createElement("canvas");
  centre.width = MASK_PX;
  centre.height = MASK_PX;
  const cctx = centre.getContext("2d");
  if (cctx) {
    const mask = makeEdgeAlphaMaskData(MASK_PX);
    const imgData = cctx.createImageData(MASK_PX, MASK_PX);
    for (let i = 0; i < mask.length; i += 4) {
      const v = mask[i]!;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    cctx.putImageData(imgData, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(centre, 0, 0, size, size);
    ctx.globalCompositeOperation = "source-over";
  }

  // Soft rim on the final canvas — alpha dies before the square border so a
  // plate edge can never read as a picture frame if it grazes the frustum.
  const rim = document.createElement("canvas");
  rim.width = MASK_PX;
  rim.height = MASK_PX;
  const rctx = rim.getContext("2d");
  if (rctx) {
    const imgData = rctx.createImageData(MASK_PX, MASK_PX);
    const half = MASK_PX / 2;
    for (let y = 0; y < MASK_PX; y++) {
      for (let x = 0; x < MASK_PX; x++) {
        const nx = Math.abs((x + 0.5 - half) / half);
        const ny = Math.abs((y + 0.5 - half) / half);
        const m = Math.max(nx, ny);
        const a = Math.round((1 - smoothstep01((m - 0.9) / 0.1)) * 255);
        const i = (y * MASK_PX + x) * 4;
        imgData.data[i] = 255;
        imgData.data[i + 1] = 255;
        imgData.data[i + 2] = 255;
        imgData.data[i + 3] = a;
      }
    }
    rctx.putImageData(imgData, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(rim, 0, 0, size, size);
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
  // Just past the bake's rim fade (0.9 half-extent) plus the drift — any more
  // magnification than that is throwing away detail we just sharpened.
  drawCoverImage(ctx, baked, cx, cy, w, h, 1.28, 1);
  ctx.restore();
  paintCenterVignette(ctx, w, h, CENTER_VIGNETTE_STRENGTH);
}
