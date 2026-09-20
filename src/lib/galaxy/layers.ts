/**
 * Corridor / ambient render passes — not SignId.
 * Sign-bound layers still key content by SignId; these ids name the pass.
 */
export type GalaxyLayerId = "station-cloud" | "dust-field";

export const GALAXY_LAYER_IDS: readonly GalaxyLayerId[] = [
  "station-cloud",
  "dust-field",
] as const;

export type GalaxyLayerMeta = {
  id: GalaxyLayerId;
  /** Stable Three.js / React name. */
  name: string;
  label: string;
  /** What this pass draws. */
  draws: string;
};

export const GALAXY_LAYERS: Record<GalaxyLayerId, GalaxyLayerMeta> = {
  "station-cloud": {
    id: "station-cloud",
    name: "vault-layer-station-cloud",
    label: "Station cloud",
    draws: "Per-sign morphing station point clouds along the temple curve",
  },
  "dust-field": {
    id: "dust-field",
    name: "vault-layer-dust-field",
    label: "Dust field",
    draws: "Ambient dust + celestial far field + near-sky (not corner galaxies)",
  },
};

export function isGalaxyLayerId(id: string): id is GalaxyLayerId {
  return (GALAXY_LAYER_IDS as readonly string[]).includes(id);
}

export function galaxyLayerName(id: GalaxyLayerId): string {
  return GALAXY_LAYERS[id].name;
}

/**
 * Quiet residual when landed inside a sign galaxy — distant sky / corner
 * blobs stay faintly alive without competing with lesson stars or HUD type.
 * Atmosphere only; never interactive.
 */
export const INSIDE_SKY_FIELD_RESIDUAL = 0.1;
export const INSIDE_SKY_HAZE_RESIDUAL = 0.09;
export const INSIDE_SKY_ARMS_RESIDUAL = 0.08;
export const INSIDE_CORNER_RESIDUAL = 0.12;
