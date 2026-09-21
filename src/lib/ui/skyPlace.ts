import { isSignId } from "@/lib/chart/sign-canon";
import type { SignId } from "@/lib/chart/types";
import { PREVIEW_HISTORY_ROOT_KEY } from "@/lib/preview-host-bridge";

/**
 * Where the visitor is in the sky UI — mirrored into the home-route search
 * string (and a same-tab session backup) so a refresh does not dump them on
 * the title screen.
 *
 * Desk deep links (`?desk=`) stay first-class; sign place uses `sign` /
 * `galaxy` / `star`. Astrological identity is always a SignId string, never a
 * calendar slot index.
 */

const SESSION_KEY = "vault.sky-place.v1";

export type SkyPlace =
  | { kind: "home" }
  | { kind: "belt"; signId: SignId }
  | { kind: "inside"; signId: SignId; star: number }
  | { kind: "library" }
  | { kind: "research"; id: "joey" | "saige" };

export type SkyPlaceSearch = {
  mesh?: string;
  desk?: string;
  sign?: SignId;
  /** Present when the viewer is inside a sign galaxy (not only belt-selected). */
  galaxy?: true;
  /** Travel-node index inside the open galaxy (0 = hub / first star). */
  star?: number;
};

/**
 * Where to write the place after a research deep link fails to open. Only the
 * failed desk lets go (to home); anything else the viewer reached meanwhile
 * — a later desk, a sign — is left alone. `null` means no change.
 */
export function releaseFailedResearchPlace(
  current: SkyPlace | null,
  failedId: "joey" | "saige",
): SkyPlace | null {
  if (current?.kind !== "research" || current.id !== failedId) return null;
  return { kind: "home" };
}

export function parseSkyPlaceSearch(search: Record<string, unknown>): SkyPlaceSearch {
  const desk = typeof search.desk === "string" ? search.desk : undefined;
  const signRaw = typeof search.sign === "string" ? search.sign : undefined;
  const sign = signRaw && isSignId(signRaw) ? signRaw : undefined;
  const galaxy =
    search.galaxy === true ||
    search.galaxy === "1" ||
    search.galaxy === "true" ||
    search.galaxy === 1
      ? true
      : undefined;
  const starRaw = search.star;
  const starNum =
    typeof starRaw === "number"
      ? starRaw
      : typeof starRaw === "string" && starRaw.trim() !== ""
        ? Number(starRaw)
        : undefined;
  const star =
    starNum != null && Number.isFinite(starNum) && starNum >= 0
      ? Math.floor(starNum)
      : undefined;
  const mesh = typeof search.mesh === "string" ? search.mesh : undefined;
  return {
    mesh,
    desk,
    sign,
    galaxy: galaxy || undefined,
    star,
  };
}

/** Decode a place from validated home search (desk wins over sign). */
export function placeFromSearch(search: SkyPlaceSearch): SkyPlace {
  if (search.desk === "library") return { kind: "library" };
  if (search.desk === "joey" || search.desk === "saige") {
    return { kind: "research", id: search.desk };
  }
  if (search.sign) {
    if (search.galaxy) {
      return { kind: "inside", signId: search.sign, star: search.star ?? 0 };
    }
    return { kind: "belt", signId: search.sign };
  }
  return { kind: "home" };
}

/** Merge place into home search while preserving unrelated keys (e.g. mesh). */
export function searchFromPlace(
  place: SkyPlace,
  prev: SkyPlaceSearch = {},
): SkyPlaceSearch {
  const next: SkyPlaceSearch = { mesh: prev.mesh };
  switch (place.kind) {
    case "home":
      return next;
    case "belt":
      return { ...next, sign: place.signId };
    case "inside":
      return {
        ...next,
        sign: place.signId,
        galaxy: true,
        star: place.star > 0 ? place.star : undefined,
      };
    case "library":
      return { ...next, desk: "library" };
    case "research":
      return { ...next, desk: place.id };
  }
}

/**
 * Entering a sign galaxy must push. Replacing the current entry leaves the
 * inside URL (`?sign=…&galaxy=true`) on the preview history root, and Back
 * no-ops there — the visitor stays on the inside canvas.
 * Belt moves, star-to-star travel, and leaving the galaxy replace.
 */
export function historyModeForPlace(
  prev: SkyPlace | null,
  next: SkyPlace,
): "push" | "replace" {
  if (next.kind === "inside" && prev?.kind !== "inside") return "push";
  return "replace";
}

/** True when this entry is the preview Back floor, or the only entry in the stack. */
export function historyStateIsRoot(state: unknown, historyLength: number): boolean {
  if (
    state !== null &&
    typeof state === "object" &&
    (state as Record<string, unknown>)[PREVIEW_HISTORY_ROOT_KEY] === true
  ) {
    return true;
  }
  return historyLength <= 1;
}

export function historyEntryIsRoot(): boolean {
  if (typeof window === "undefined") return true;
  return historyStateIsRoot(window.history.state, window.history.length);
}

/**
 * The inside view pushed its own history entry, so in-app Back can pop it
 * instead of only swapping the phase under the same URL.
 */
let insideHistoryEntry = false;

export function markInsideHistoryEntry(active: boolean): void {
  insideHistoryEntry = active;
}

export function hasInsideHistoryEntry(): boolean {
  return insideHistoryEntry;
}

export function placesEqual(a: SkyPlace, b: SkyPlace): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "home":
    case "library":
      return true;
    case "belt":
      return b.kind === "belt" && a.signId === b.signId;
    case "inside":
      return b.kind === "inside" && a.signId === b.signId && a.star === b.star;
    case "research":
      return b.kind === "research" && a.id === b.id;
  }
}

/** Live place from galaxy + session mirrors (claim/natal keep underlying sky). */
export function placeFromLiveState(input: {
  surface: "galaxy" | "library";
  sessionKind: "visitor" | "shelf" | "research" | null;
  researchId?: "joey" | "saige" | null;
  explorePhase: string;
  exploreSignIndex: number | null;
  pointIndex: number;
  moved: boolean;
  signIndex: number;
  signIdAt: (index: number) => SignId | null;
}): SkyPlace {
  if (input.sessionKind === "research") {
    const id = input.researchId;
    if (id === "joey" || id === "saige") return { kind: "research", id };
  }
  if (input.surface === "library" && !input.sessionKind) {
    return { kind: "library" };
  }

  const exploring = input.explorePhase !== "idle";
  if (exploring && input.exploreSignIndex != null) {
    const signId = input.signIdAt(input.exploreSignIndex);
    if (signId) {
      return {
        kind: "inside",
        signId,
        star: Math.max(0, Math.floor(input.pointIndex) || 0),
      };
    }
  }

  if (input.moved) {
    const signId = input.signIdAt(input.signIndex);
    if (signId) return { kind: "belt", signId };
  }

  return { kind: "home" };
}

export function savePlaceSession(place: SkyPlace): void {
  try {
    if (place.kind === "home") {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(place));
  } catch {
    /* private mode */
  }
}

export function readPlaceSession(): SkyPlace | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SkyPlace;
    return normalizeStoredPlace(parsed);
  } catch {
    return null;
  }
}

function normalizeStoredPlace(raw: unknown): SkyPlace | null {
  if (!raw || typeof raw !== "object") return null;
  const place = raw as SkyPlace;
  switch (place.kind) {
    case "home":
      return { kind: "home" };
    case "library":
      return { kind: "library" };
    case "belt":
      return isSignId(place.signId) ? { kind: "belt", signId: place.signId } : null;
    case "inside": {
      if (!isSignId(place.signId)) return null;
      const star =
        typeof place.star === "number" && Number.isFinite(place.star)
          ? Math.max(0, Math.floor(place.star))
          : 0;
      return { kind: "inside", signId: place.signId, star };
    }
    case "research":
      return place.id === "joey" || place.id === "saige"
        ? { kind: "research", id: place.id }
        : null;
    default:
      return null;
  }
}

/** Prefer URL search; fall back to same-tab session backup. */
export function resolveBootPlace(search: SkyPlaceSearch): SkyPlace {
  const fromUrl = placeFromSearch(search);
  if (fromUrl.kind !== "home") return fromUrl;
  return readPlaceSession() ?? { kind: "home" };
}
