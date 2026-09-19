import type { Dignity, PlanetId } from "./types";

export type PlanetDef = {
  id: PlanetId;
  name: string;
  glyph: string;
  lon: number;
  house: number;
  wholeSign: number;
  retrograde: boolean;
  dignity: Dignity;
  color: string;
  glow: string;
  size: number;
  radius: number;
  headline: string;
  why: string;
  body: string[];
  note: string;
};

/**
 * Visual look only — safe for the public client bundle.
 * Natal planet tables live under `nativities/` and load only for the site owner.
 */
export const PLANET_LOOK: Record<
  PlanetId,
  { color: string; glow: string; size: number; radius: number }
> = {
  sun: { color: "#e6c98a", glow: "#c9a15b", size: 0.2, radius: 5.35 },
  moon: { color: "#d7c4c8", glow: "#8b4a62", size: 0.175, radius: 5.7 },
  mercury: { color: "#c5d0c2", glow: "#8aa084", size: 0.155, radius: 5.15 },
  venus: { color: "#c9d4dc", glow: "#8aa3b3", size: 0.185, radius: 5.85 },
  mars: { color: "#c47a64", glow: "#a85a46", size: 0.15, radius: 5.5 },
  jupiter: { color: "#cfc6a8", glow: "#9a916c", size: 0.17, radius: 6.05 },
  saturn: { color: "#8a9aa3", glow: "#5e7380", size: 0.16, radius: 5.25 },
  uranus: { color: "#8bb8b8", glow: "#5a8a8a", size: 0.13, radius: 4.85 },
  neptune: { color: "#7a92ab", glow: "#4a6a88", size: 0.13, radius: 5 },
  pluto: { color: "#b09aa6", glow: "#6a4a58", size: 0.145, radius: 4.7 },
  node: { color: "#d2c6b0", glow: "#a09070", size: 0.12, radius: 6.25 },
  chiron: { color: "#b8a898", glow: "#7a6a58", size: 0.11, radius: 4.45 },
  lilith: { color: "#a89098", glow: "#6a4854", size: 0.1, radius: 6.4 },
  asc: { color: "#efe8dc", glow: "#cfc3b0", size: 0.09, radius: 6.7 },
  mc: { color: "#ddd4c6", glow: "#b0a494", size: 0.09, radius: 6.7 },
};
