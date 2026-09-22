import type { ChakraId, PlanetId } from "./types";

export type ChakraDef = {
  id: ChakraId;
  name: string;
  sanskrit: string;
  y: number;
  color: string;
  glow: string;
  rulers: PlanetId[];
  headline: string;
  body: string[];
  practice: string;
};

/**
 * Structure + look only — safe for visitor charts / client bundles.
 * Natal chakra essays live under `nativities/saige-chakras.ts`.
 */
export const CHAKRAS: ChakraDef[] = [
  {
    id: "root",
    name: "Root",
    sanskrit: "Muladhara",
    y: 0.28,
    color: "#c45c4a",
    glow: "#8a382c",
    rulers: ["node", "saturn", "chiron"],
    headline: "Enough. A house. A Tuesday that still exists.",
    body: [],
    practice: "Build the thing that still exists on an ordinary Tuesday.",
  },
  {
    id: "sacral",
    name: "Sacral",
    sanskrit: "Svadhisthana",
    y: 0.62,
    color: "#d08958",
    glow: "#a06038",
    rulers: ["moon", "venus", "lilith"],
    headline: "The feeling-body does not do halfway.",
    body: [],
    practice: "Do not override a true no for a year.",
  },
  {
    id: "solar",
    name: "Solar plexus",
    sanskrit: "Manipura",
    y: 0.98,
    color: "#d4b46a",
    glow: "#a88840",
    rulers: ["sun", "mars"],
    headline: "The will is royal. It lives in the vault.",
    body: [],
    practice: "Go back to the vault when pride is asked to perform.",
  },
  {
    id: "heart",
    name: "Heart",
    sanskrit: "Anahata",
    y: 1.36,
    color: "#7a9a7e",
    glow: "#4e7054",
    rulers: ["venus", "saturn"],
    headline: "The house and the pulse. Both. Not one.",
    body: [],
    practice: "Choose the person who can stay interesting and stay.",
  },
  {
    id: "throat",
    name: "Throat",
    sanskrit: "Vishuddha",
    y: 1.72,
    color: "#6a8aaa",
    glow: "#3a5470",
    rulers: ["mercury", "jupiter"],
    headline: "Name it cleanly, or it is not ready.",
    body: [],
    practice: "If you cannot explain a decision in clean sentences, wait.",
  },
  {
    id: "brow",
    name: "Brow",
    sanskrit: "Ajna",
    y: 2.08,
    color: "#6a6e9a",
    glow: "#3e4270",
    rulers: ["mercury", "uranus", "pluto"],
    headline: "Sudden knowing. The room changes first.",
    body: [],
    practice: "Give the weather a house. Do not become less.",
  },
  {
    id: "crown",
    name: "Crown",
    sanskrit: "Sahasrara",
    y: 2.38,
    color: "#cfc6d4",
    glow: "#8a8090",
    rulers: ["jupiter", "neptune"],
    headline: "Faith that has to be earned with the hands.",
    body: [],
    practice: "Make the huge idea actually work. That is the sacred.",
  },
];

export const CHAKRA_BY_ID: Record<ChakraId, ChakraDef> = CHAKRAS.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<ChakraId, ChakraDef>,
);
