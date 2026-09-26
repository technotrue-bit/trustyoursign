import type { GateId, ReadingId } from "./types";

export type GateDef = {
  id: GateId;
  name: string;
  kicker: string;
  headline: string;
  body: string[];
  /** Newcomer beat. Optional on research books; digest fills it for visitors. */
  street?: string;
};

export type StepDef = {
  n: number;
  title: string;
  body: string;
};

export type ReadingDef = {
  id: ReadingId;
  name: string;
  headline: string;
  body: string[];
  /** Newcomer beat. Optional on research books; digest fills it for visitors. */
  street?: string;
};

/** Public module — natal gates/readings are not in the tracked tree. */
