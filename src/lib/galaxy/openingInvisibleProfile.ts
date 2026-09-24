import { introChrome, introField, introPlaying, introTitle } from "./intro";

export type InvisibleOpeningProfile = {
  fieldCrossAt: number | null;
  hudCrossAt: number | null;
  windowMs: number | null;
  buckets: Record<string, number>;
};

const BUCKETS = [
  "nebulaCenterWell",
  "cornerGalaxiesWhileHidden",
  "hiddenStationFrame",
  "signGalaxyIdleDust",
  "celestialArmsHazeWhileHidden",
  "webglWhileChromeHidden",
] as const;

function devProfileEnabled() {
  return import.meta.env?.DEV === true;
}

function probe(): InvisibleOpeningProfile {
  if (typeof window === "undefined") {
    return { fieldCrossAt: null, hudCrossAt: null, windowMs: null, buckets: {} };
  }
  const w = window as Window & { __tysInvisibleOpening?: InvisibleOpeningProfile };
  if (!w.__tysInvisibleOpening) {
    w.__tysInvisibleOpening = {
      fieldCrossAt: null,
      hudCrossAt: null,
      windowMs: null,
      buckets: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
    };
  }
  return w.__tysInvisibleOpening;
}

/** introField > 0.02 until HUD title (introTitle ≥ 0.3). */
export function openingHudWindowActive() {
  if (!introPlaying()) return false;
  return introField() > 0.02 && introTitle() < 0.3;
}

export function noteInvisibleMs(bucket: (typeof BUCKETS)[number], ms: number) {
  if (!devProfileEnabled() || ms <= 0) return;
  if (!openingHudWindowActive()) return;
  const p = probe();
  p.buckets[bucket] = (p.buckets[bucket] ?? 0) + ms;
}

export function tickInvisibleOpeningProfile() {
  if (!devProfileEnabled() || typeof performance === "undefined") return;
  const p = probe();
  const field = introField();
  const title = introTitle();
  if (!p.fieldCrossAt && field > 0.02) p.fieldCrossAt = performance.now();
  if (p.fieldCrossAt && !p.hudCrossAt && title >= 0.3) {
    p.hudCrossAt = performance.now();
    p.windowMs = p.hudCrossAt - p.fieldCrossAt;
  }
}

export function largestInvisibleBucket(p: InvisibleOpeningProfile) {
  let name = "";
  let ms = 0;
  for (const [k, v] of Object.entries(p.buckets)) {
    if (v > ms) {
      ms = v;
      name = k;
    }
  }
  return { name, ms };
}

export function readInvisibleOpeningProfile(): InvisibleOpeningProfile {
  return probe();
}
