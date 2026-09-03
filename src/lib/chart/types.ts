export type ResearchChartId = "saige" | "joey";
export type ChartId = ResearchChartId | "visitor";
export function isResearchChartId(id: string | null | undefined): id is ResearchChartId {
  return id === "saige" || id === "joey";
}
export type Element = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";
export type Dignity = "domicile" | "exaltation" | "detriment" | "fall" | "peregrine" | "angle";

export type AppMode = "sky" | "body" | "gates" | "machine" | "readings" | "bones" | "ask";

export type SelectionKind = "planet" | "sign" | "chakra" | "gate" | "step" | "aspect" | "reading";

export type Selection = {
  kind: SelectionKind;
  id: string;
} | null;

export type SignId =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type PlanetId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "node"
  | "chiron"
  | "lilith"
  | "asc"
  | "mc";

export type ChakraId =
  | "root"
  | "sacral"
  | "solar"
  | "heart"
  | "throat"
  | "brow"
  | "crown";

export type GateId = "rising" | "sun" | "moon";

export type ReadingId = "love" | "work" | "wound" | "becoming" | "wire" | "return";

export type AspectType =
  | "conjunction"
  | "opposition"
  | "square"
  | "trine"
  | "sextile"
  | "quincunx"
  | "sesquare"
  | "quintile";
