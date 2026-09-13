import { create } from "zustand";
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { AppMode, ResearchChartId, Selection, SignId } from "@/lib/chart/types";
import { isDateInSign } from "@/lib/chart/sun";
import { followingBeat, markBeatSeen, markTourDone, nextJoeyBeat } from "@/lib/chart/tour";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { useGalaxy } from "@/lib/galaxy/store";
import { OPEN_T, exitSignGalaxy, exploringSign, resetTravel, seekSign } from "@/lib/galaxy/travel";
import {
  applyCloseState,
  clearClaimState,
  clearSelectionState,
  foldSheetState,
  nextTourState,
  openClaimState,
  openSessionState,
  patchSessionState,
  setClaimBirthState,
  setHoverState,
  setModeState,
  setSelectionState,
  setSurfaceState,
  skipTourState,
  type VaultDomainState,
} from "./actions";
import { fromResearch, fromShelf, fromVisitor, visitorBirth, visitorSign } from "./factories";
import type { BirthFacts, Surface } from "./types";

export type ShelfSessionInput = {
  id?: string;
  label: string;
  signId: SignId;
  birth: BirthFacts;
  skyNatal: SkyNatal | null;
  tone?: "vault" | "warm";
  relation?: "self" | "other";
  personName?: string | null;
  origin: Surface;
  fromSavedId?: string;
};

export type SessionStore = VaultDomainState & {
  openVisitor: (nativity: Nativity, skyNatal: SkyNatal | null) => void;
  openResearch: (id: ResearchChartId, nativity: Nativity) => void;
  openShelf: (input: ShelfSessionInput) => void;
  openLibrary: () => void;
  attachSavedId: (savedId: string) => void;
  openClaim: (signId: SignId) => void;
  closeClaim: () => void;
  setClaimBirth: (birth: BirthFacts) => void;
  setShelfNatal: (natal: SkyNatal) => void;
  setShelfTone: (tone: "vault" | "warm") => void;
  setMode: (mode: AppMode) => void;
  select: (selection: Selection) => void;
  hover: (hovered: Selection) => void;
  clear: () => void;
  close: () => void;
  nextTour: () => void;
  skipTour: () => void;
  foldSheet: (folded: boolean) => void;
};

/** Galaxy travel effects stay at this boundary; domain actions remain pure. */
export function seekSignFor(signId: SignId): void {
  const index = CONSTELLATIONS.findIndex((constellation) => constellation.id === signId);
  if (index >= 0) seekSign(index);
}

/** Restore the exact open-galaxy travel state used by the legacy store. */
export function resetGalaxyTravel(): void {
  resetTravel(false);
  useGalaxy.setState({ born: true, moved: false, t: OPEN_T, signIndex: 0 });
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  claim: null,
  surface: "galaxy",

  openVisitor: (nativity, skyNatal) => {
    const state = get();
    const birth = state.claim?.birth ?? visitorBirth(nativity);
    const signId = state.claim?.signId ?? visitorSign(nativity, birth);
    const session = fromVisitor({
      nativity,
      skyNatal,
      birth,
      signId,
      origin: "galaxy",
    });
    set((current) => openSessionState(current, session));
  },

  openResearch: (id, nativity) => {
    const beat = id === "joey" ? nextJoeyBeat() : null;
    const session = fromResearch({
      chartKey: id,
      nativity,
      origin: "library",
      tourBeat: beat?.id ?? null,
      mode: beat?.mode ?? "sky",
      selection: beat?.selection ?? null,
    });
    set((state) => openSessionState(state, session));
  },

  openShelf: (input) => {
    seekSignFor(input.signId);
    const session = fromShelf(input);
    set((state) => openSessionState(state, session));
  },

  openLibrary: () => set((state) => setSurfaceState(state, "library")),

  attachSavedId: (savedId) =>
    set((state) => {
      if (!state.session) return state;
      if (state.session.kind === "research") return state;
      const patch =
        state.session.kind === "shelf"
          ? { savedId, chartKey: savedId }
          : { savedId };
      return patchSessionState(state, patch);
    }),

  openClaim: (signId) => {
    seekSignFor(signId);
    set((state) => openClaimState(state, signId));
  },

  closeClaim: () => set((state) => clearClaimState(state)),

  setClaimBirth: (birth) =>
    set((state) => {
      if (state.claim && !isDateInSign(state.claim.signId, birth.month, birth.day)) {
        return state;
      }
      return setClaimBirthState(state, birth);
    }),

  setShelfNatal: (natal) =>
    set((state) => {
      if (state.session?.kind !== "shelf") return state;
      return patchSessionState(state, { skyNatal: natal, tone: natal.tone });
    }),

  setShelfTone: (tone) =>
    set((state) => {
      if (state.session?.kind !== "shelf") return state;
      const skyNatal = state.session.skyNatal ? { ...state.session.skyNatal, tone } : null;
      return patchSessionState(state, { tone, skyNatal });
    }),

  setMode: (mode) => set((state) => setModeState(state, mode)),
  select: (selection) => set((state) => setSelectionState(state, selection)),
  hover: (hovered) => set((state) => setHoverState(state, hovered)),
  clear: () => set((state) => clearSelectionState(state)),

  close: () => {
    const state = get();
    // Leaving claim/natal while a sign galaxy is open must exit the dive —
    // otherwise StarBack only clears claim and remounts the trapped hub HUD.
    if (exploringSign()) exitSignGalaxy();
    const returnsToGalaxy =
      state.session?.origin === "galaxy" ||
      (!state.session && !state.claim && state.surface === "library");
    if (returnsToGalaxy) resetGalaxyTravel();
    set((current) => applyCloseState(current));
  },

  nextTour: () => {
    const id = get().session?.tourBeat;
    if (!id) return;
    markBeatSeen(id);
    const next = followingBeat(id);
    if (!next) markTourDone();
    set((state) => nextTourState(state, next));
  },

  skipTour: () => {
    markTourDone();
    set((state) => skipTourState(state));
  },

  foldSheet: (folded) => set((state) => foldSheetState(state, folded)),
}));
