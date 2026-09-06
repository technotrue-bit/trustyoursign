import { create } from "zustand";
import { CONSTELLATIONS } from "./constellations";
import type { ExplorePhase } from "./signGalaxy";
import { stationFromT } from "./temple";

type ExploreUi = {
  phase: ExplorePhase;
  signIndex: number | null;
  progress: number;
  worldFade: number;
  plateFade: number;
  galaxyForm: number;
  pointIndex: number;
};

type GalaxyState = {
  t: number;
  moved: boolean;
  signIndex: number;
  born: boolean;
  chakraNote: string | null;
  introTitle: number;
  introChrome: number;
  introAsk: number;
  introVeil: number;
  introSkip: boolean;
  introDone: boolean;
  explore: ExploreUi;
  setTravel: (t: number, moved?: boolean, signIndexOverride?: number) => void;
  markBorn: () => void;
  setChakraNote: (id: string | null) => void;
  setExplore: (explore: ExploreUi) => void;
};

const IDLE_EXPLORE: ExploreUi = {
  phase: "idle",
  signIndex: null,
  progress: 0,
  worldFade: 1,
  plateFade: 1,
  galaxyForm: 0,
  pointIndex: 0,
};

export const useGalaxy = create<GalaxyState>((set, get) => ({
  t: 0,
  moved: false,
  signIndex: 0,
  born: false,
  chakraNote: null,
  introTitle: 0,
  introChrome: 0,
  introAsk: 0,
  introVeil: 0,
  introSkip: false,
  introDone: false,
  explore: IDLE_EXPLORE,
  setTravel: (t, moved, signIndexOverride) => {
    const signIndex =
      signIndexOverride != null
        ? ((Math.round(signIndexOverride) % 12) + 12) % 12
        : stationFromT(t);
    const prev = get();
    if (prev.signIndex === signIndex && prev.moved === !!moved && Math.abs(prev.t - t) < 0.008) {
      return;
    }
    set({
      t,
      signIndex,
      moved: moved ?? prev.moved,
    });
  },
  markBorn: () => {
    if (get().born) return;
    set({ born: true });
  },
  setChakraNote: (id) => set({ chakraNote: id }),
  setExplore: (explore) => {
    const prev = get().explore;
    if (
      prev.phase === explore.phase &&
      prev.signIndex === explore.signIndex &&
      prev.pointIndex === explore.pointIndex &&
      Math.abs(prev.progress - explore.progress) < 0.01 &&
      Math.abs(prev.worldFade - explore.worldFade) < 0.02 &&
      Math.abs(prev.plateFade - explore.plateFade) < 0.02 &&
      Math.abs(prev.galaxyForm - explore.galaxyForm) < 0.02
    ) {
      return;
    }
    set({ explore: { ...explore } });
  },
}));

export function currentConstellation() {
  return CONSTELLATIONS[useGalaxy.getState().signIndex]!;
}
