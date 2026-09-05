import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { AppMode, ResearchChartId, Selection, SignId } from "@/lib/chart/types";
import { isDateInSign } from "@/lib/chart/sun";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import type { BirthFacts, ChartSession, Surface } from "./types";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

export function visitorBirth(nativity: Nativity): BirthFacts {
  const date = (nativity.meta.date || "").match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
  const time = (nativity.meta.time || "").match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  const month = date ? MONTHS.indexOf(date[2]!.toLowerCase() as (typeof MONTHS)[number]) + 1 : 1;
  let hour = time ? Number(time[1]) : null;
  const minute = time ? Number(time[2]) : null;
  if (hour != null && time?.[3]) {
    hour %= 12;
    if (time[3].toLowerCase() === "pm") hour += 12;
  }
  return {
    year: date ? Number(date[3]) : 0,
    month: month > 0 ? month : 1,
    day: date ? Number(date[1]) : 1,
    hour,
    minute,
    place: nativity.meta.place || null,
  };
}

export function visitorSign(nativity: Nativity, birth: BirthFacts): SignId {
  const sun = nativity.planets?.find((planet) => planet.id === "sun");
  if (sun) {
    const longitude = ((sun.lon % 360) + 360) % 360;
    return CONSTELLATIONS[Math.floor(longitude / 30)]!.id;
  }
  if (birth.year === 0) return "aries";
  return (
    CONSTELLATIONS.find((constellation) => isDateInSign(constellation.id, birth.month, birth.day))
      ?.id ?? "aries"
  );
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
  // Research files may omit birth metadata or the sun; these non-null fields remain
  // placeholders until session identity becomes nullable in architecture #2.
  const birth = visitorBirth(input.nativity);
  const signId = visitorSign(input.nativity, birth);
  return {
    id: input.id ?? `research-${input.chartKey}`,
    kind: "research",
    chartKey: input.chartKey,
    label: input.nativity.meta.name,
    relation: "self",
    personName: input.nativity.meta.name,
    signId,
    tone: "vault",
    birth,
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
