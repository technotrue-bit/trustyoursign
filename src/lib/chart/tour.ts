import type { AppMode, Selection } from "./types";

export type TourBeat = {
  id: string;
  mode: AppMode;
  selection: Selection;
  kicker: string;
  title: string;
  body: string;
};

/** Joey only. Oldest first; the last beat is “what just came in.” */
export const JOEY_TOUR: TourBeat[] = [
  {
    id: "body-wells",
    mode: "body",
    selection: { kind: "chakra", id: "heart" },
    kicker: "Added",
    title: "The wells",
    body: "Chakras are not a rail on the fly-through. They live in the body once a chart is locked. This is that room.",
  },
  {
    id: "ask-machine",
    mode: "ask",
    selection: { kind: "planet", id: "sun" },
    kicker: "Added",
    title: "Ask the chart",
    body: "Tap a body. The machine answers that body, not the whole sky. The talk stays on this chart.",
  },
  {
    id: "gates-three",
    mode: "gates",
    selection: { kind: "gate", id: "sun" },
    kicker: "What just came in",
    title: "The Big Three",
    body: "Rising, Sun, Moon — the face, the will, the weather. A timed chart shows them as rooms, not as a sun-sign shelf.",
  },
];

const KEY = "vault-joey-tour-seen";

function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function beatById(id: string | null): TourBeat | null {
  if (!id) return null;
  return JOEY_TOUR.find((b) => b.id === id) ?? null;
}

/** First unseen beat, or the newest if the walkthrough is already current. */
export function nextJoeyBeat(): TourBeat {
  const seen = new Set(readSeen());
  return JOEY_TOUR.find((b) => !seen.has(b.id)) ?? JOEY_TOUR[JOEY_TOUR.length - 1]!;
}

export function markBeatSeen(id: string) {
  const seen = readSeen();
  if (!seen.includes(id)) writeSeen([...seen, id]);
}

export function markTourDone() {
  writeSeen(JOEY_TOUR.map((b) => b.id));
}

export function followingBeat(id: string): TourBeat | null {
  const i = JOEY_TOUR.findIndex((b) => b.id === id);
  if (i < 0) return null;
  return JOEY_TOUR[i + 1] ?? null;
}
