import { create } from "zustand";
import { CONSTELLATIONS, nearestSign, wrap12 } from "./constellations";

type GalaxyState = {
  t: number;
  moved: boolean;
  signIndex: number;
  born: boolean;
  setTravel: (t: number, moved?: boolean) => void;
  markBorn: () => void;
};

export const useGalaxy = create<GalaxyState>((set, get) => ({
  t: 0,
  moved: false,
  signIndex: 0,
  born: false,
  setTravel: (t, moved) => {
    const signIndex = nearestSign(t);
    const prev = get();
    if (prev.signIndex === signIndex && prev.moved === !!moved && Math.abs(prev.t - t) < 0.04) {
      return;
    }
    set({
      t: wrap12(t),
      signIndex,
      moved: moved ?? prev.moved,
    });
  },
  markBorn: () => {
    if (get().born) return;
    set({ born: true });
  },
}));

export function currentConstellation() {
  return CONSTELLATIONS[useGalaxy.getState().signIndex]!;
}
