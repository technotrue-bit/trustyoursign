import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { AppMode, ChartId, Selection, SignId } from "@/lib/chart/types";

export type BirthFacts = {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  place: string | null;
};

export type Surface = "galaxy" | "library";

export type SessionKind = "visitor" | "research" | "shelf";

export type ClaimDraft = {
  signId: SignId;
  birth: BirthFacts | null;
};

export type ChartSession = {
  id: string;
  kind: SessionKind;
  /** Research: joey|saige. Visitor: always "visitor". Shelf: saved id or ephemeral id. */
  chartKey: ChartId | string;
  /** Set when a visitor/shelf session is tied to a persisted charts row. */
  savedId?: string;
  label: string;
  relation: "self" | "other";
  personName: string | null;
  signId: SignId;
  tone: "vault" | "warm";
  birth: BirthFacts;
  nativity: Nativity | null;
  skyNatal: SkyNatal | null;
  origin: Surface;
  mode: AppMode;
  selection: Selection;
  hovered: Selection;
  tourBeat: string | null;
  sheetFolded: boolean;
};
