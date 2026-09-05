import { create } from "zustand";
import type { AppMode, ChartId, Selection, SignId } from "@/lib/chart/types";
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { OPEN_T, galaxyTravel, resetTravel, seekSign } from "@/lib/galaxy/travel";
import { useGalaxy } from "@/lib/galaxy/store";
import { isDateInSign } from "@/lib/chart/sun";
import { followingBeat, markBeatSeen, markTourDone, nextJoeyBeat } from "@/lib/chart/tour";
import {
  chatFromPhase,
  phaseAfterCloseBirthChat,
  phaseAfterOpenBirthChat,
  phaseAfterOpenVisitor,
  type VaultPhase,
} from "@/lib/vault-phase";

export type { VaultPhase };

export type BirthDate = {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  place: string | null;
};

export type ShelfSketch = {
  id: string;
  label: string;
  signId: SignId;
  birthMonth: number;
  birthDay: number;
  birthYear: number;
  birthHour: number | null;
  birthMinute: number | null;
  birthPlace: string | null;
  natal: SkyNatal | null;
  tone: "vault" | "warm";
  relation: "self" | "other";
  personName: string | null;
  from: "galaxy" | "library";
};

type VaultState = {
  entered: boolean;
  gate: "galaxy" | "library";
  /** Journey on `/`: fly → birth dock → forge → chart modes. */
  phase: VaultPhase;
  forgeJobId: string | null;
  chartId: ChartId | null;
  research: Nativity | null;
  shelf: ShelfSketch | null;
  mode: AppMode;
  selection: Selection;
  hovered: Selection;
  /** Alias for `phase === "dock"` — kept for slide/busy callers. */
  chat: boolean;
  pickedSign: SignId | null;
  birth: BirthDate | null;
  tourBeat: string | null;
  sheetFolded: boolean;
  /** Big Three payload kept beside a visitor Nativity for Ask / deep-cut. */
  skyNatal: SkyNatal | null;
  openChart: (id: ChartId, research: Nativity) => void;
  openVisitor: (research: Nativity, sky: SkyNatal | null) => void;
  setChart: (id: ChartId) => void;
  openShelf: (sketch: Omit<ShelfSketch, "id"> & { id?: string }) => void;
  openLibrary: () => void;
  openGalaxy: () => void;
  library: () => void;
  openBirthChat: (sign: SignId) => void;
  closeBirthChat: () => void;
  enterForge: (jobId: string) => void;
  leaveForge: () => void;
  setBirth: (birth: BirthDate) => void;
  setShelfNatal: (natal: SkyNatal) => void;
  setShelfTone: (tone: "vault" | "warm") => void;
  setMode: (mode: AppMode) => void;
  select: (selection: Selection) => void;
  hover: (hovered: Selection) => void;
  clear: () => void;
  goBack: () => void;
  nextTour: () => void;
  skipTour: () => void;
  foldSheet: (folded: boolean) => void;
};

function withPhase(phase: VaultPhase, extra: Partial<VaultState> = {}) {
  return { phase, chat: chatFromPhase(phase), ...extra };
}

export const useVault = create<VaultState>((set, get) => ({
  entered: false,
  gate: "galaxy",
  phase: "galaxy",
  forgeJobId: null,
  chartId: null,
  research: null,
  shelf: null,
  mode: "sky",
  selection: null,
  hovered: null,
  chat: false,
  pickedSign: null,
  birth: null,
  tourBeat: null,
  sheetFolded: false,
  skyNatal: null,
  openChart: (id, research) => {
    const walk = id === "joey";
    const beat = walk ? nextJoeyBeat() : null;
    set({
      ...withPhase(phaseAfterOpenVisitor()),
      chartId: id,
      research,
      shelf: null,
      skyNatal: null,
      entered: true,
      gate: "library",
      mode: beat?.mode ?? "sky",
      selection: beat?.selection ?? null,
      hovered: null,
      forgeJobId: null,
      tourBeat: beat?.id ?? null,
    });
  },
  openVisitor: (research, sky) => {
    set({
      ...withPhase(phaseAfterOpenVisitor()),
      chartId: "visitor",
      research,
      shelf: null,
      skyNatal: sky,
      entered: true,
      gate: "galaxy",
      mode: "sky",
      selection: null,
      hovered: null,
      forgeJobId: null,
      tourBeat: null,
      sheetFolded: false,
    });
  },
  setChart: (id) =>
    set({
      chartId: id,
      research: null,
      shelf: null,
      skyNatal: null,
      mode: "sky",
      selection: null,
      hovered: null,
      tourBeat: null,
    }),
  openShelf: (sketch) => {
    const i = CONSTELLATIONS.findIndex((c) => c.id === sketch.signId);
    if (i >= 0) seekSign(i);
    const id = sketch.id ?? (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `shelf-${Date.now()}`);
    set({
      ...withPhase(phaseAfterOpenVisitor()),
      shelf: {
        ...sketch,
        id,
        natal: sketch.natal ?? null,
        tone: sketch.tone ?? "vault",
      },
      chartId: null,
      research: null,
      skyNatal: sketch.natal ?? null,
      entered: true,
      gate: sketch.from === "library" ? "library" : "galaxy",
      mode: "ask",
      selection: null,
      hovered: null,
      forgeJobId: null,
      pickedSign: sketch.signId,
      birth: {
        month: sketch.birthMonth,
        day: sketch.birthDay,
        year: sketch.birthYear,
        hour: sketch.birthHour,
        minute: sketch.birthMinute,
        place: sketch.birthPlace,
      },
      tourBeat: null,
    });
  },
  openLibrary: () =>
    set({
      ...withPhase("galaxy"),
      gate: "library",
      entered: false,
      chartId: null,
      research: null,
      shelf: null,
      skyNatal: null,
      selection: null,
      hovered: null,
      forgeJobId: null,
      tourBeat: null,
      sheetFolded: false,
    }),
  openGalaxy: () => {
    resetTravel(false);
    useGalaxy.setState({ born: true, moved: false, t: OPEN_T, signIndex: 0 });
    set({
      ...withPhase("galaxy"),
      gate: "galaxy",
      entered: false,
      chartId: null,
      research: null,
      shelf: null,
      skyNatal: null,
      selection: null,
      hovered: null,
      mode: "sky",
      forgeJobId: null,
      pickedSign: null,
      birth: null,
      tourBeat: null,
      sheetFolded: false,
    });
  },
  library: () =>
    set({
      ...withPhase("galaxy"),
      entered: false,
      chartId: null,
      research: null,
      shelf: null,
      skyNatal: null,
      selection: null,
      hovered: null,
      mode: "sky",
      gate: "library",
      forgeJobId: null,
      tourBeat: null,
      sheetFolded: false,
    }),
  openBirthChat: (sign) => {
    const i = CONSTELLATIONS.findIndex((c) => c.id === sign);
    // Skip seek when already on this sign — claim frame must not re-prime art + publishTravel.
    if (i >= 0 && useGalaxy.getState().signIndex !== i) seekSign(i);
    // Start 3D slide immediately; defer React dock phase so the click task stays short.
    galaxyTravel.dockSlide = true;
    galaxyTravel.dockSign = sign;
    galaxyTravel.dockCamReady = false;
    galaxyTravel.busy = true;
    const commit = () =>
      set({
        ...withPhase(phaseAfterOpenBirthChat()),
        pickedSign: sign,
        gate: "galaxy",
        birth: null,
        forgeJobId: null,
      });
    // Next macrotask — must not share the click long-task with React dock commit.
    setTimeout(() => {
      commit();
      // FOV/well after a couple paints so React dock set does not share a projection snap.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          galaxyTravel.dockCamReady = true;
        });
      });
    }, 0);
  },
  closeBirthChat: () => {
    galaxyTravel.dockSlide = false;
    galaxyTravel.dockSign = null;
    galaxyTravel.dockCamReady = false;
    set({
      ...withPhase(phaseAfterCloseBirthChat()),
      birth: null,
      forgeJobId: null,
    });
  },
  enterForge: (jobId) =>
    set({
      ...withPhase("forge"),
      forgeJobId: jobId,
      entered: false,
      gate: "galaxy",
    }),
  leaveForge: () =>
    set({
      ...withPhase(phaseAfterOpenBirthChat()),
      forgeJobId: null,
    }),
  setBirth: (birth) => {
    const sign = get().pickedSign;
    if (sign && !isDateInSign(sign, birth.month, birth.day)) return;
    set({ birth });
  },
  setShelfNatal: (natal) => {
    const shelf = get().shelf;
    if (!shelf) return;
    set({ shelf: { ...shelf, natal, tone: natal.tone } });
  },
  setShelfTone: (tone) => {
    const shelf = get().shelf;
    if (!shelf) return;
    const natal = shelf.natal ? { ...shelf.natal, tone } : null;
    set({ shelf: { ...shelf, tone, natal } });
  },
  setMode: (mode) => {
    if (mode === "ask") set({ mode, hovered: null });
    else set({ mode, selection: null, hovered: null });
  },
  select: (selection) => set({ selection }),
  hover: (hovered) => set({ hovered }),
  clear: () => set({ selection: null }),
  goBack: () => {
    const s = get();
    if (s.shelf) {
      if (s.shelf.from === "library") s.library();
      else s.openGalaxy();
      return;
    }
    if (s.entered) {
      if (s.chartId === "visitor") {
        s.openGalaxy();
        return;
      }
      s.library();
      return;
    }
    if (s.phase === "forge") {
      s.leaveForge();
      return;
    }
    if (s.phase === "dock" || s.chat) {
      s.closeBirthChat();
      return;
    }
    if (s.gate === "library") s.openGalaxy();
  },
  nextTour: () => {
    const id = get().tourBeat;
    if (!id) return;
    markBeatSeen(id);
    const next = followingBeat(id);
    if (!next) {
      markTourDone();
      set({ tourBeat: null });
      return;
    }
    set({
      tourBeat: next.id,
      mode: next.mode,
      selection: next.selection,
      hovered: null,
    });
  },
  skipTour: () => {
    markTourDone();
    set({ tourBeat: null });
  },
  foldSheet: (folded) => set({ sheetFolded: folded }),
}));
