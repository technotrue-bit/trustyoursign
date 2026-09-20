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
