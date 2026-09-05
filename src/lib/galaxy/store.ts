import { create } from "zustand";
import { CONSTELLATIONS } from "./constellations";
import { stationFromT } from "./temple-data";

type GalaxyState = {
  t: number;
  moved: boolean;
  signIndex: number;
  /** Station whose plate is on screen — drives delayed sign title. */
  signPlateIndex: number | null;
  born: boolean;
  chakraNote: string | null;
  /** Discrete intro flags only — continuous opacities use CSS vars (B3). */
  introAsking: boolean;
  introSkip: boolean;
  introDone: boolean;
  setTravel: (t: number, moved?: boolean, signIndexOverride?: number) => void;
  markBorn: () => void;
  setChakraNote: (id: string | null) => void;
};

export const useGalaxy = create<GalaxyState>((set, get) => ({
  t: 0,
  moved: false,
  signIndex: 0,
  signPlateIndex: null,
  born: false,
  chakraNote: null,
  introAsking: false,
  introSkip: false,
  introDone: false,
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
}));

export function currentConstellation() {
  return CONSTELLATIONS[useGalaxy.getState().signIndex]!;
}
