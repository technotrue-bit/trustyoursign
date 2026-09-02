import { create } from "zustand";
import { CONSTELLATIONS } from "./constellations";
import { stationFromT } from "./temple";

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
  setTravel: (t: number, moved?: boolean) => void;
  markBorn: () => void;
  setChakraNote: (id: string | null) => void;
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
  setTravel: (t, moved) => {
    const signIndex = stationFromT(t);
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
}));

export function currentConstellation() {
  return CONSTELLATIONS[useGalaxy.getState().signIndex]!;
}
