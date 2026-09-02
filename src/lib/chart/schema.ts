import type { AspectDef } from "./aspects";
import type { ChakraDef } from "./chakras";
import type { GateDef, ReadingDef, StepDef } from "./copy";
import type { HouseCusp } from "./houses";
import type { Angles } from "./geometry";
import type { PlanetDef } from "./planets";
import type { SignDef } from "./signs";
import type { ChartId, ChakraId, GateId, PlanetId, ReadingId } from "./types";

export type ExtraBone = {
  name: string;
  pos: string;
  house: string;
  note: string;
};

export type Meta = {
  name: string;
  date: string;
  time: string;
  place: string;
  coords: string;
  zone: string;
  julian: string;
  zodiac: string;
  houses: string;
  node: string;
  engine: string;
  sunAltitude: string;
  oneCut: string;
  thesis: string;
};

export type Nativity = {
  id: ChartId;
  person: "she" | "you";
  meta: Meta;
  angles: Angles;
  planets: PlanetDef[];
  planetById: Record<PlanetId, PlanetDef>;
  houses: HouseCusp[];
  elements: { fire: number; earth: number; air: number; water: number };
  modalities: { cardinal: number; fixed: number; mutable: number };
  signs: SignDef[];
  aspects: AspectDef[];
  chakras: ChakraDef[];
  chakraById: Record<ChakraId, ChakraDef>;
  gates: GateDef[];
  gateById: Record<GateId, GateDef>;
  steps: StepDef[];
  decisionClose: string;
  readings: ReadingDef[];
  readingById: Partial<Record<ReadingId, ReadingDef>>;
  suggested: string[];
  alwaysLabel: PlanetId[];
  extraBones: ExtraBone[];
  canonExtra: string;
  machineTitle: string;
  readingsTitle: string;
};
