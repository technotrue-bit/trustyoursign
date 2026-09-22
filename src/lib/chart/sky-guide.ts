import type { SessionKind } from "@/lib/chart/session/types";

export type SkyGuideTarget = "sky" | "dock" | "sheet" | "ask";

export type SkyGuideBeat = {
  id: string;
  target: SkyGuideTarget;
  kicker: string;
  title: string;
  body: string;
  /** When set, switch the natal room before showing this beat. */
  mode?: "sky" | "ask";
};

const KEY = "vault-sky-guide-seen";

/** In-memory fallback when localStorage is unavailable (tests / private mode). */
let memorySeen = false;

const VISITOR_BEATS: readonly SkyGuideBeat[] = [
  {
    id: "sky-field",
    target: "sky",
    kicker: "Your natal",
    title: "This is your sky",
    body: "This is your sky. Drag to turn it. Tap a planet when you want its note.",
    mode: "sky",
  },
  {
    id: "sky-dock",
    target: "dock",
    kicker: "Rooms",
    title: "One chart, many rooms",
    body: "These rooms are the same chart — Body, Gates, Machine, Readings, Bones, Ask.",
  },
  {
    id: "sky-sheet",
    target: "sheet",
    kicker: "The page",
    title: "Lists live here",
    body: "This page holds the list. Fold it away whenever you want the sky alone.",
  },
  {
    id: "sky-ask",
    target: "ask",
    kicker: "Words",
    title: "Ask when you want words",
    body: "Ask speaks to one body at a time. Tap Ask when you want words.",
    mode: "ask",
  },
] as const;

const SHELF_BEATS: readonly SkyGuideBeat[] = [
  {
    id: "shelf-sky",
    target: "sky",
    kicker: "Your sky",
    title: "This is your sky",
    body: "This is your sky. Drag to turn it. The sun you claimed is held here.",
    mode: "sky",
  },
  {
    id: "shelf-ask",
    target: "ask",
    kicker: "Words",
    title: "Ask lives here too",
    body: "Ask speaks to one body at a time. Tap Ask when you want words.",
    mode: "ask",
  },
] as const;

export function skyGuideBeats(kind: SessionKind): readonly SkyGuideBeat[] {
  if (kind === "shelf") return SHELF_BEATS;
  if (kind === "visitor") return VISITOR_BEATS;
  return [];
}

export function readSkyGuideSeen(): boolean {
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage.getItem(KEY) === "1") return true;
    } catch {
      /* fall through to memory */
    }
  }
  return memorySeen;
}

export function shouldStartSkyGuide(kind: SessionKind | null): boolean {
  if (kind !== "visitor" && kind !== "shelf") return false;
  return !readSkyGuideSeen();
}

export function markSkyGuideDone(): void {
  memorySeen = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* memory already set */
  }
}

/** Test helper — clears the seen flag. */
export function clearSkyGuideSeen(): void {
  memorySeen = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
