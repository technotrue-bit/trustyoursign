import type { SignId } from "@/lib/chart/types";

/** PNG URLs + HTMLImageElement warm — no three. Safe for VaultApp / travel / FallbackSky. */

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

const images = new Map<string, HTMLImageElement>();
const aspects = new Map<string, number>();
const readyHooks = new Set<(id: SignId) => void>();

export function onSignImageReady(fn: (id: SignId) => void) {
  readyHooks.add(fn);
  return () => {
    readyHooks.delete(fn);
  };
}

function notifyReady(id: SignId) {
  for (const fn of readyHooks) fn(id);
}

export function ensureSignImage(id: SignId) {
  const url = SIGN_ART[id];
  let img = images.get(url);
  if (img) return img;
  img = new Image();
  img.decoding = "async";
  img.onload = () => {
    aspects.set(url, img!.naturalWidth / Math.max(1, img!.naturalHeight));
    const paint = () => notifyReady(id);
    if (typeof img!.decode === "function") img!.decode().then(paint).catch(paint);
    else paint();
  };
  img.onerror = () => {
    window.setTimeout(() => {
      images.delete(url);
      ensureSignImage(id);
    }, 700);
  };
  img.src = url;
  images.set(url, img);
  return img;
}

/** Warm the PNG only — does not allocate a canvas or three texture. */
export function primeSignArt(id: SignId) {
  if (typeof window === "undefined") return;
  ensureSignImage(id);
}

export function preloadSignArt() {
  if (typeof window === "undefined") return;
  ensureSignImage("aries");
  ensureSignImage("taurus");
}

export function preloadSignArtRest() {
  if (typeof window === "undefined") return;
  (Object.keys(SIGN_ART) as SignId[]).forEach((id) => {
    if (id === "aries" || id === "taurus") return;
    ensureSignImage(id);
  });
}

export function signArtImage(id: SignId): HTMLImageElement {
  return ensureSignImage(id);
}

export function getSignImageMap() {
  return images;
}

export function getSignAspectMap() {
  return aspects;
}

export function imageReady(id: SignId) {
  const img = images.get(SIGN_ART[id]);
  return Boolean(img?.complete && (img.naturalWidth ?? 0) > 2);
}
