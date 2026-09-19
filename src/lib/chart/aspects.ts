import type { AspectType, PlanetId } from "./types";

export type AspectDef = {
  id: string;
  a: PlanetId;
  b: PlanetId;
  type: AspectType;
  orb: number;
  iron: boolean;
  text: string;
};

/** Colors only — natal aspect tables live under `nativities/`. */
export const ASPECT_COLOR: Record<AspectType, string> = {
  conjunction: "#efe8dc",
  opposition: "#b07080",
  square: "#c49a7a",
  trine: "#8aa090",
  sextile: "#8aa3b3",
  quincunx: "#7a7068",
  sesquare: "#a88878",
  quintile: "#cfc3b0",
};
