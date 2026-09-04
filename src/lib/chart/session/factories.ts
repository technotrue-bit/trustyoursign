import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { AppMode, ResearchChartId, Selection, SignId } from "@/lib/chart/types";
import type { BirthFacts, ChartSession, Surface } from "./types";

const SIGN_IDS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const satisfies readonly SignId[];

function signIdFromLon(lon: number): SignId {
  const L = ((lon % 360) + 360) % 360;
  return SIGN_IDS[Math.min(11, Math.floor(L / 30))]!;
}

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function fromVisitor(input: {
  nativity: Nativity;
  skyNatal: SkyNatal | null;
  birth: BirthFacts;
  signId: SignId;
  origin: Surface;
  label?: string;
  relation?: "self" | "other";
  personName?: string | null;
  tone?: "vault" | "warm";
  savedId?: string;
  id?: string;
}): ChartSession {
  return {
    id: input.id ?? newSessionId(),
    kind: "visitor",
    chartKey: "visitor",
    savedId: input.savedId,
    label: input.label ?? input.nativity.meta.name ?? "Your natal",
    relation: input.relation ?? "self",
    personName: input.personName ?? null,
    signId: input.signId,
    tone: input.tone ?? input.skyNatal?.tone ?? "vault",
    birth: input.birth,
    nativity: input.nativity,
    skyNatal: input.skyNatal,
    origin: input.origin,
    mode: "sky",
    selection: null,
    hovered: null,
    tourBeat: null,
    sheetFolded: false,
  };
}

export function fromResearch(input: {
  chartKey: ResearchChartId;
  nativity: Nativity;
  origin?: Surface;
  tourBeat?: string | null;
  mode?: AppMode;
  selection?: Selection;
  id?: string;
}): ChartSession {
  const sun = input.nativity.planets?.find((p) => p.id === "sun");
  const signId: SignId = sun ? signIdFromLon(sun.lon) : "aries";
  return {
    id: input.id ?? `research-${input.chartKey}`,
    kind: "research",
    chartKey: input.chartKey,
    label: input.nativity.meta.name,
    relation: "self",
    personName: input.nativity.meta.name,
    signId,
    tone: "vault",
    birth: {
      year: 0,
      month: 1,
      day: 1,
      hour: null,
      minute: null,
      place: input.nativity.meta.place || null,
    },
    nativity: input.nativity,
    skyNatal: null,
    origin: input.origin ?? "library",
    mode: input.mode ?? "sky",
    selection: input.selection ?? null,
    hovered: null,
    tourBeat: input.tourBeat ?? null,
    sheetFolded: false,
  };
}

export function fromShelf(input: {
  id?: string;
  signId: SignId;
  birth: BirthFacts;
  skyNatal: SkyNatal | null;
  nativity?: Nativity | null;
  tone?: "vault" | "warm";
  relation?: "self" | "other";
  personName?: string | null;
  label: string;
  origin: Surface;
  fromSavedId?: string;
  mode?: AppMode;
}): ChartSession {
  const id = input.id ?? input.fromSavedId ?? newSessionId();
  return {
    id,
    kind: "shelf",
    chartKey: input.fromSavedId ?? id,
    savedId: input.fromSavedId,
    label: input.label,
    relation: input.relation ?? "self",
    personName: input.personName ?? null,
    signId: input.signId,
    tone: input.tone ?? input.skyNatal?.tone ?? "vault",
    birth: input.birth,
    nativity: input.nativity ?? null,
    skyNatal: input.skyNatal,
    origin: input.origin,
    mode: input.mode ?? "ask",
    selection: null,
    hovered: null,
    tourBeat: null,
    sheetFolded: false,
  };
}
