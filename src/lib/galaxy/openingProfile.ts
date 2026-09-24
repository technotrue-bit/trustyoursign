import { introField, introPlaying, introTitle } from "./intro";

export type OpeningProfile = {
  fieldCrossAt: number | null;
  hudCrossAt: number | null;
  windowMs: number | null;
  buckets: Record<string, number>;
  morphFills: number;
  volumeBuilds: number;
};

const BUCKETS = [
  "webglRender",
  "celestialSky",
  "birthNebula",
  "dust",
  "stationStars",
  "templeRigFrame",
  "reactPublish",
] as const;

function probe(): OpeningProfile {
  if (typeof window === "undefined") {
    return {
      fieldCrossAt: null,
      hudCrossAt: null,
      windowMs: null,
      buckets: {},
      morphFills: 0,
      volumeBuilds: 0,
    };
  }
  const w = window as Window & { __tysOpeningProfile?: OpeningProfile };
  if (!w.__tysOpeningProfile) {
    w.__tysOpeningProfile = {
      fieldCrossAt: null,
      hudCrossAt: null,
      windowMs: null,
      buckets: Object.fromEntries(BUCKETS.map((b) => [b, 0])),
      morphFills: 0,
      volumeBuilds: 0,
    };
  }
  return w.__tysOpeningProfile;
}

/** introField > 0.02 until HUD title (introTitle ≥ 0.3). */
export function openingHudWindowActive() {
  if (!introPlaying()) return false;
  return introField() > 0.02 && introTitle() < 0.3;
}

export function noteOpeningMs(bucket: (typeof BUCKETS)[number], ms: number) {
  if (!import.meta.env.DEV || ms <= 0) return;
  if (!openingHudWindowActive()) return;
  const p = probe();
  p.buckets[bucket] = (p.buckets[bucket] ?? 0) + ms;
}

export function noteOpeningMorphFill() {
  if (!import.meta.env.DEV || !openingHudWindowActive()) return;
  probe().morphFills += 1;
}

export function noteOpeningVolumeBuild() {
  if (!import.meta.env.DEV || !openingHudWindowActive()) return;
  probe().volumeBuilds += 1;
}

export function tickOpeningProfile() {
  if (!import.meta.env.DEV || typeof performance === "undefined") return;
  const p = probe();
  const field = introField();
  const title = introTitle();
  if (!p.fieldCrossAt && field > 0.02) p.fieldCrossAt = performance.now();
  if (p.fieldCrossAt && !p.hudCrossAt && title >= 0.3) {
    p.hudCrossAt = performance.now();
    p.windowMs = p.hudCrossAt - p.fieldCrossAt;
  }
}

export function readOpeningProfile(): OpeningProfile {
  return probe();
}

export function largestOpeningBucket(p: OpeningProfile) {
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
