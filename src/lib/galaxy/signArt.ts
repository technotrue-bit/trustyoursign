import { CanvasTexture, ClampToEdgeWrapping, LinearFilter, SRGBColorSpace } from "three";
import type { SignId } from "@/lib/chart/types";
import { isSmallGpu } from "@/lib/gpu";

export const SIGN_ART: Record<SignId, string> = {
  aries: "/signs/aries.png",
  taurus: "/signs/taurus.png",
  gemini: "/signs/gemini.png",
  cancer: "/signs/cancer.png",
  leo: "/signs/leo.png",
  virgo: "/signs/virgo.png",
  libra: "/signs/libra.png",
  scorpio: "/signs/scorpio.png",
  sagittarius: "/signs/sagittarius.png",
  capricorn: "/signs/capricorn.png",
  aquarius: "/signs/aquarius.png",
  pisces: "/signs/pisces.png",
};

export function getSignArtUrl(id: SignId): string {
  return SIGN_ART[id];
}

function canvasSize(): { w: number; h: number } {
  if (typeof window !== "undefined" && isSmallGpu()) return { w: 512, h: 288 };
  return { w: 1024, h: 576 };
}

const images = new Map<string, HTMLImageElement>();
/** Every canvas for a URL — independent, never shared across meshes. */
const texturesByUrl = new Map<string, Set<CanvasTexture>>();
/** Textures that actually had pixels drawn — keyed by texture, not URL. */
const paintedTex = new WeakSet<CanvasTexture>();
const aspects = new Map<string, number>();

function style(tex: CanvasTexture) {
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.premultiplyAlpha = false;
}

function blankCanvas() {
  const { w, h } = canvasSize();
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function register(url: string, tex: CanvasTexture) {
  let set = texturesByUrl.get(url);
  if (!set) {
    set = new Set();
    texturesByUrl.set(url, set);
  }
  set.add(tex);
}

function unregister(url: string, tex: CanvasTexture) {
  const set = texturesByUrl.get(url);
  if (!set) return;
  set.delete(tex);
  if (set.size === 0) texturesByUrl.delete(url);
}

function rasterAll(id: SignId) {
  const set = texturesByUrl.get(SIGN_ART[id]);
  if (!set) return;
  for (const tex of set) raster(id, tex);
}

function ensureImage(id: SignId) {
  const url = SIGN_ART[id];
  let img = images.get(url);
  if (img) return img;
  img = new Image();
  img.decoding = "async";
  img.onload = () => {
    const paint = () => rasterAll(id);
    if (typeof img.decode === "function") img.decode().then(paint).catch(paint);
    else paint();
  };
  img.onerror = () => {
    window.setTimeout(() => {
      images.delete(url);
      ensureImage(id);
    }, 700);
  };
  img.src = url;
  images.set(url, img);
  return img;
}

function raster(id: SignId, tex: CanvasTexture) {
  const url = SIGN_ART[id];
  const img = images.get(url);
  if (!img || !img.complete || (img.naturalWidth ?? 0) < 2) return false;
  const canvas = tex.image as HTMLCanvasElement;
  if (!canvas || typeof canvas.getContext !== "function") return false;
  const { w: W, h: H } = canvasSize();
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return false;
  ctx.clearRect(0, 0, W, H);
  const ir = img.naturalWidth / Math.max(1, img.naturalHeight);
  const cr = W / H;
  let dw: number;
  let dh: number;
  let dx: number;
  let dy: number;
  if (ir > cr) {
    dw = W;
    dh = dw / ir;
    dx = 0;
    dy = (H - dh) / 2;
  } else {
    dh = H;
    dw = dh * ir;
    dy = 0;
    dx = (W - dw) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  aspects.set(url, img.naturalWidth / Math.max(1, img.naturalHeight));
  style(tex);
  tex.needsUpdate = true;
  paintedTex.add(tex);
  register(url, tex);
  return true;
}

/** Draw this sign onto THIS texture. Never skip just because another canvas for the same URL was painted. */
export function hydrateSignArt(id: SignId, tex: CanvasTexture) {
  register(SIGN_ART[id], tex);
  ensureImage(id);
  if (paintedTex.has(tex)) return true;
  return raster(id, tex);
}

/** Fresh canvas per call. Release with `releaseSignArt` when the mesh unmounts. */
export function loadSignArt(id: SignId): CanvasTexture {
  const tex = new CanvasTexture(blankCanvas());
  style(tex);
  register(SIGN_ART[id], tex);
  ensureImage(id);
  hydrateSignArt(id, tex);
  return tex;
}

/** Drop a plate texture from the registry and free GPU/canvas memory. Safe to call twice. */
export function releaseSignArt(tex: CanvasTexture | null | undefined) {
  if (!tex) return;
  for (const [url, set] of texturesByUrl) {
    if (!set.has(tex)) continue;
    set.delete(tex);
    if (set.size === 0) texturesByUrl.delete(url);
    break;
  }
  const canvas = tex.image as HTMLCanvasElement | undefined;
  if (canvas && typeof canvas.width === "number") {
    // Keep a valid source while React/Three finishes its unmount frame. A
    // zero-sized canvas can trigger texSubImage2D INVALID_VALUE warnings.
    canvas.width = 1;
    canvas.height = 1;
  }
  tex.dispose();
}

/** Warm the PNG only — does not allocate a canvas. */
export function primeSignArt(id: SignId) {
  if (typeof window === "undefined") return;
  ensureImage(id);
}

export function preloadSignArt() {
  if (typeof window === "undefined") return;
  ensureImage("aries");
  ensureImage("taurus");
}

/** Prefetch plate PNGs for aimed station ±1 (and Aries/Taurus keep warm). */
export function preloadSignArtNear(index: number) {
  if (typeof window === "undefined") return;
  const ids = Object.keys(SIGN_ART) as SignId[];
  const n = ids.length;
  const i = ((index % n) + n) % n;
  for (const j of [i - 1, i, i + 1]) {
    if (j < 0 || j >= n) continue;
    ensureImage(ids[j]!);
  }
}

/** @deprecated Prefer preloadSignArtNear — kept for callers that still warm the rest lazily. */
export function preloadSignArtRest() {
  if (typeof window === "undefined") return;
  preloadSignArtNear(0);
  preloadSignArtNear(1);
}

export function artReady(tex: CanvasTexture) {
  return paintedTex.has(tex);
}

export function artAspect(tex: CanvasTexture, fallback = 16 / 9) {
  for (const [url, set] of texturesByUrl) {
    if (set.has(tex)) return aspects.get(url) ?? fallback;
  }
  return fallback;
}

export function signArtImage(id: SignId): HTMLImageElement {
  return ensureImage(id);
}

export function plateReady(id: SignId) {
  const set = texturesByUrl.get(SIGN_ART[id]);
  if (set) {
    for (const tex of set) {
      if (paintedTex.has(tex)) return true;
    }
  }
  const img = images.get(SIGN_ART[id]);
  return Boolean(img?.complete && (img.naturalWidth ?? 0) > 2);
}
