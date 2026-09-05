import { CanvasTexture, ClampToEdgeWrapping, LinearFilter, SRGBColorSpace } from "three";
import type { SignId } from "@/lib/chart/types";
import {
  SIGN_ART,
  ensureSignImage,
  getSignAspectMap,
  getSignImageMap,
  imageReady,
  onSignImageReady,
} from "./signArtMedia";

export {
  SIGN_ART,
  primeSignArt,
  preloadSignArt,
  preloadSignArtRest,
  signArtImage,
} from "./signArtMedia";

const W = 1024;
const H = 576;
/** Every canvas for a URL — independent, never shared across meshes. */
const texturesByUrl = new Map<string, Set<CanvasTexture>>();
/** Textures that actually had pixels drawn — keyed by texture, not URL. */
const paintedTex = new WeakSet<CanvasTexture>();

onSignImageReady((id) => {
  const set = texturesByUrl.get(SIGN_ART[id]);
  if (!set) return;
  for (const tex of set) raster(id, tex);
});

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
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
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

function raster(id: SignId, tex: CanvasTexture) {
  const url = SIGN_ART[id];
  const img = getSignImageMap().get(url);
  if (!img || !img.complete || (img.naturalWidth ?? 0) < 2) return false;
  const canvas = tex.image as HTMLCanvasElement;
  if (!canvas || typeof canvas.getContext !== "function") return false;
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
  getSignAspectMap().set(url, img.naturalWidth / Math.max(1, img.naturalHeight));
  style(tex);
  tex.needsUpdate = true;
  paintedTex.add(tex);
  register(url, tex);
  return true;
}

/** Draw this sign onto THIS texture. Never skip just because another canvas for the same URL was painted. */
export function hydrateSignArt(id: SignId, tex: CanvasTexture) {
  register(SIGN_ART[id], tex);
  ensureSignImage(id);
  if (paintedTex.has(tex)) return true;
  return raster(id, tex);
}

/** Fresh canvas per call. Do not share / dispose these textures. */
export function loadSignArt(id: SignId): CanvasTexture {
  const tex = new CanvasTexture(blankCanvas());
  style(tex);
  register(SIGN_ART[id], tex);
  ensureSignImage(id);
  hydrateSignArt(id, tex);
  return tex;
}

export function artReady(tex: CanvasTexture) {
  return paintedTex.has(tex);
}

export function artAspect(tex: CanvasTexture, fallback = 16 / 9) {
  const aspects = getSignAspectMap();
  for (const [url, set] of texturesByUrl) {
    if (set.has(tex)) return aspects.get(url) ?? fallback;
  }
  return fallback;
}

export function plateReady(id: SignId) {
  const set = texturesByUrl.get(SIGN_ART[id]);
  if (set) {
    for (const tex of set) {
      if (paintedTex.has(tex)) return true;
    }
  }
  return imageReady(id);
}
