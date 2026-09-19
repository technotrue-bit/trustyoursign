import { SIGN_CANON, SIGN_IDS } from "@/lib/chart/sign-canon";
import type { ChakraId, Element, Modality, SignId } from "@/lib/chart/types";
import { CatmullRomCurve3, Color, Vector3 } from "three";

export const STATION_N = 12;
export const NAVE = 44;
export const PLATE_WIDE = 16.5;
export const PLATE_ASPECT = 16 / 9;

export type TemplePalette = {
  particle: string;
  fog: string;
  accent: string;
  chest: string;
};

export type TempleSign = {
  id: SignId;
  name: string;
  dates: string;
  month: string;
  element: Element;
  modality: Modality;
  palette: TemplePalette;
  essence: string;
  lines: string[];
  chakra: ChakraId;
  chakraNote: string;
};

const PALETTE: Record<SignId, TemplePalette> = {
  aries: { particle: "#f0d4c6", fog: "#1a120e", accent: "#e8c49a", chest: "#fff4dc" },
  taurus: { particle: "#d8c9a4", fog: "#12140f", accent: "#c4a06a", chest: "#efe6d0" },
  gemini: { particle: "#e8e6dc", fog: "#121214", accent: "#d0d4d8", chest: "#f4f2ea" },
  cancer: { particle: "#d4dde4", fog: "#101418", accent: "#b8c8c8", chest: "#e8f0f0" },
  leo: { particle: "#f0d4a8", fog: "#1a140c", accent: "#e8b45a", chest: "#fff0c8" },
  virgo: { particle: "#ddd4b8", fog: "#14140f", accent: "#c4b888", chest: "#efe8d4" },
  libra: { particle: "#ead8d0", fog: "#161214", accent: "#e0b8b0", chest: "#f6e8e4" },
  scorpio: { particle: "#c8a098", fog: "#140c0c", accent: "#8a3030", chest: "#e8c8c0" },
  sagittarius: { particle: "#d4c4e0", fog: "#120e18", accent: "#c4a05a", chest: "#efe4f4" },
  capricorn: { particle: "#d0c8b8", fog: "#121210", accent: "#b8a878", chest: "#ece6d8" },
  aquarius: { particle: "#c8dce4", fog: "#0e1418", accent: "#7ec8d0", chest: "#e4f4f6" },
  pisces: { particle: "#c0c8e0", fog: "#0e1018", accent: "#7a88c8", chest: "#e0e4f4" },
};

const COPY: Record<
  SignId,
  { essence: string; lines: string[]; chakra: TempleSign["chakra"]; chakraNote: string }
> = {
  aries: {
    essence: "The private strike. Heat at the root, not a public war.",
    lines: [
      "Cardinal fire. Beginnings live in the body, the house, the first step taken without a committee.",
      "Aries does not wait to be invited. It moves, then names the motion.",
      "Pride here is a spark, not a stage.",
    ],
    chakra: "root",
    chakraNote: "The ram starts in the feet. Enough. A first step that still exists on a Tuesday.",
  },
  taurus: {
    essence: "Enoughness. A nervous system allowed to come down.",
    lines: [
      "Fixed earth. Slow worth. Food, land, a private life that is actually private.",
      "The prescription is not more intensity. It is stay.",
      "Beauty that can be touched, kept, fed.",
    ],
    chakra: "root",
    chakraNote: "Taurus is the root’s medicine: body, food, land, the holy boring.",
  },
  gemini: {
    essence: "Two channels. Talk as a way of arriving.",
    lines: [
      "Mutable air. Wit, twins, the conversation that is already a kiss.",
      "Duplication is not indecision. It is bandwidth.",
      "The mouth is an engine.",
    ],
    chakra: "throat",
    chakraNote: "Gemini lives in the throat: two voices, one breath.",
  },
  cancer: {
    essence: "Need that lives inside the bond.",
    lines: [
      "Cardinal water. Belonging has a tide and a cost.",
      "The house is a feeling, then a structure.",
      "Care is not a performance.",
    ],
    chakra: "sacral",
    chakraNote: "Cancer is the sacral’s weather: held, or it floods.",
  },
  leo: {
    essence: "The vault, not the stage.",
    lines: [
      "Fixed fire. Pride is the self that remains after fusion.",
      "Heat in the private. A clean cut when silence has failed.",
      "The center is a locked room.",
    ],
    chakra: "solar",
    chakraNote: "Leo is the furnace behind the door, not a stage light.",
  },
  virgo: {
    essence: "The blade that loves small truths.",
    lines: [
      "Mutable earth. Craft, discrimination, the sacred ordinary.",
      "Faith earned with the hands.",
      "Detail as devotion.",
    ],
    chakra: "solar",
    chakraNote: "Virgo sorts the fire into work that can be kept.",
  },
  libra: {
    essence: "The public in-between.",
    lines: [
      "Cardinal air. Harmony, counsel, the art of sitting between.",
      "Charm, then the room asks you to grow up.",
      "Beauty as a form of justice.",
    ],
    chakra: "heart",
    chakraNote: "Libra is the heart’s diplomacy: two, not one.",
  },
  scorpio: {
    essence: "All or nothing. Never halfway.",
    lines: [
      "Fixed water. Safety is truth that cannot be taken.",
      "Devotion first. Comfort will not be the language.",
      "The underworld as a craft.",
    ],
    chakra: "sacral",
    chakraNote: "Scorpio is the feeling-body that does not do halfway.",
  },
  sagittarius: {
    essence: "Fire at the door.",
    lines: [
      "Mutable fire. Heat, horizon, a future-tense walk.",
      "The face the world gets. Not the vault.",
      "Honesty as a kind of travel.",
    ],
    chakra: "brow",
    chakraNote: "Sagittarius aims. The arrow is a sentence.",
  },
  capricorn: {
    essence: "Time as a spine.",
    lines: [
      "Cardinal earth. Authority, competence, the long weather.",
      "The adult that was asked for too early.",
      "Structure that can be lived in.",
    ],
    chakra: "root",
    chakraNote: "Capricorn is the root’s architecture: a Tuesday that holds.",
  },
  aquarius: {
    essence: "The future’s atmosphere.",
    lines: [
      "Fixed air. Worth that belongs to a group as much as a wallet.",
      "A nose for what a room is dreaming.",
      "Distance as a form of care.",
    ],
    chakra: "throat",
    chakraNote: "Aquarius speaks for the weather, not the brand.",
  },
  pisces: {
    essence: "The dissolve that still has a name.",
    lines: [
      "Mutable water. Mercy, music, the edge of the map.",
      "Not lost. Porous on purpose.",
      "Faith without a brochure.",
    ],
    chakra: "crown",
    chakraNote: "Pisces is the last water: return, not escape.",
  },
};

export const TEMPLE_SIGNS: TempleSign[] = SIGN_IDS.map((id) => {
  const c = COPY[id]!;
  const canon = SIGN_CANON[id];
  return {
    id,
    name: canon.name,
    dates: canon.dates,
    month: canon.month,
    element: canon.element,
    modality: canon.modality,
    palette: PALETTE[id],
    essence: c.essence,
    lines: c.lines,
    chakra: c.chakra,
    chakraNote: c.chakraNote,
  };
});

export const TEMPLE_CHAKRAS = [
  { id: "root" as const, name: "Root", sanskrit: "Muladhara", y: 0.28, color: "#c45c4a", glow: "#8a382c" },
  { id: "sacral" as const, name: "Sacral", sanskrit: "Svadhisthana", y: 0.62, color: "#d08958", glow: "#a06038" },
  { id: "solar" as const, name: "Solar", sanskrit: "Manipura", y: 0.96, color: "#d4a85a", glow: "#a07830" },
  { id: "heart" as const, name: "Heart", sanskrit: "Anahata", y: 1.28, color: "#6a9a72", glow: "#3d6a44" },
  { id: "throat" as const, name: "Throat", sanskrit: "Vishuddha", y: 1.56, color: "#6a8aaa", glow: "#3a5470" },
  { id: "brow" as const, name: "Brow", sanskrit: "Ajna", y: 1.82, color: "#6a6aaa", glow: "#3a3a70" },
  { id: "crown" as const, name: "Crown", sanskrit: "Sahasrara", y: 2.08, color: "#c8b8d4", glow: "#7a6a88" },
];

export function stationT(index: number) {
  const i = Math.min(11, Math.max(0, Math.round(index)));
  return i / (STATION_N - 1);
}

export function stationFromT(t: number) {
  return Math.round(Math.min(1, Math.max(0, t)) * (STATION_N - 1));
}

export function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function viewAspect(size?: { width: number; height: number }) {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const winW = vv?.width ?? (typeof window !== "undefined" ? window.innerWidth : 0);
  const winH = vv?.height ?? (typeof window !== "undefined" ? window.innerHeight : 0);
  const winA = winH > 0 ? winW / winH : 1;
  const boxA = size && size.height > 0 ? size.width / size.height : winA;
  return Math.min(2.3, Math.max(0.36, Math.min(boxA, winA) || 1));
}

export function heroFrame(
  viewA: number,
  intro = 1,
  plateAspect = PLATE_ASPECT,
  plateWide = PLATE_WIDE,
  well?: { top: number; bottom: number },
) {
  const a = Math.min(2.3, Math.max(0.36, viewA || 1));
  const portrait = a < 0.95;
  const artA = Math.min(2.4, Math.max(0.8, plateAspect || PLATE_ASPECT));
  const fov = portrait ? Math.min(68, 48 + (1 - a) * 28) : 56;
  const v = (fov * Math.PI) / 180;
  const wide = plateWide;
  const tall = wide / artA;
  const top = well?.top ?? (portrait ? 0.13 : 0.08);
  const bottom = well?.bottom ?? (portrait ? 0.22 : 0.14);
  const usableY = Math.max(0.4, 1 - top - bottom);
  const padX = portrait ? 0.92 : 0.9;
  const padY = usableY * 0.96;
  const distX = wide / 2 / padX / (Math.tan(v / 2) * a);
  const distY = tall / 2 / padY / Math.tan(v / 2);
  const rest = Math.max(distX, distY);
  const z = rest * (0.7 + intro * 0.3);
  const lift = portrait ? (bottom - top) * 1.35 : 0;
  return { fov, z, y: portrait ? 0.22 + lift : 0.55, portrait, aspect: a, lift };
}

const _pts: Vector3[] = [];
for (let i = 0; i < STATION_N; i++) {
  const z = -i * NAVE;
  const x = Math.sin(i * 0.34) * 3.6;
  const y = 1.35 + Math.cos(i * 0.2) * 0.4;
  _pts.push(new Vector3(x, y, z));
}

export const TEMPLE_CURVE = new CatmullRomCurve3(_pts, false, "catmullrom", 0.28);
export const TEMPLE_STATIONS = _pts.map((p) => p.clone());

const _fogA = new Color();
const _fogB = new Color();
const _accA = new Color();
const _accB = new Color();

export function lerpFog(t: number, out: Color) {
  const u = clamp01(t) * (STATION_N - 1);
  const i = Math.floor(u);
  const f = u - i;
  const a = TEMPLE_SIGNS[i] ?? TEMPLE_SIGNS[0]!;
  const b = TEMPLE_SIGNS[Math.min(11, i + 1)] ?? a;
  _fogA.set(a.palette.fog);
  _fogB.set(b.palette.fog);
  return out.copy(_fogA).lerp(_fogB, f);
}

export function lerpAccent(t: number, out: Color) {
  const u = clamp01(t) * (STATION_N - 1);
  const i = Math.floor(u);
  const f = u - i;
  const a = TEMPLE_SIGNS[i] ?? TEMPLE_SIGNS[0]!;
  const b = TEMPLE_SIGNS[Math.min(11, i + 1)] ?? a;
  _accA.set(a.palette.accent);
  _accB.set(b.palette.accent);
  return out.copy(_accA).lerp(_accB, f);
}
