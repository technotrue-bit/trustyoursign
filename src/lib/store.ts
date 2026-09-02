import { create } from "zustand";
import type { AppMode, ChartId, Selection, SignId } from "@/lib/chart/types";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { galaxyTravel, resetTravel, seekSign } from "@/lib/galaxy/travel";
import { useGalaxy } from "@/lib/galaxy/store";
import { isDateInSign } from "@/lib/chart/sun";

export type BirthDate = { year: number; month: number; day: number };

type VaultState = {
  entered: boolean;
  gate: "galaxy" | "library";
  chartId: ChartId | null;
  mode: AppMode;
  selection: Selection;
  hovered: Selection;
  chat: boolean;
  pickedSign: SignId | null;
  birth: BirthDate | null;
  openChart: (id: ChartId) => void;
  setChart: (id: ChartId) => void;
  openLibrary: () => void;
  openGalaxy: () => void;
  library: () => void;
  openBirthChat: (sign: SignId) => void;
  closeBirthChat: () => void;
  setBirth: (birth: BirthDate) => void;
  setMode: (mode: AppMode) => void;
  select: (selection: Selection) => void;
  hover: (hovered: Selection) => void;
  clear: () => void;
  goBack: () => void;
};

export const useVault = create<VaultState>((set, get) => ({
  entered: false,
  gate: "galaxy",
  chartId: null,
  mode: "sky",
  selection: null,
  hovered: null,
  chat: false,
  pickedSign: null,
  birth: null,
  openChart: (id) =>
    set({
      chartId: id,
      entered: true,
      gate: "library",
      mode: "sky",
      selection: null,
      hovered: null,
      chat: false,
    }),
  setChart: (id) => set({ chartId: id, mode: "sky", selection: null, hovered: null }),
  openLibrary: () =>
    set({
      gate: "library",
      entered: false,
      chartId: null,
      selection: null,
      hovered: null,
      chat: false,
    }),
  openGalaxy: () => {
    resetTravel(false);
    useGalaxy.setState({ born: true, moved: false, t: 0, signIndex: 0 });
    set({
      gate: "galaxy",
      entered: false,
      chartId: null,
      selection: null,
      hovered: null,
      mode: "sky",
      chat: false,
      pickedSign: null,
      birth: null,
    });
  },
  library: () =>
    set({
      entered: false,
      chartId: null,
      selection: null,
      hovered: null,
      mode: "sky",
      gate: "library",
      chat: false,
    }),
  openBirthChat: (sign) => {
    const i = CONSTELLATIONS.findIndex((c) => c.id === sign);
    if (i >= 0) seekSign(i);
    set({ chat: true, pickedSign: sign, gate: "galaxy", birth: null });
  },
  closeBirthChat: () => set({ chat: false, birth: null }),
  setBirth: (birth) => {
    const sign = get().pickedSign;
    if (sign && !isDateInSign(sign, birth.month, birth.day)) return;
    set({ birth });
  },
  setMode: (mode) => set({ mode, selection: null, hovered: null }),
  select: (selection) => set({ selection }),
  hover: (hovered) => set({ hovered }),
  clear: () => set({ selection: null }),
  goBack: () => {
    const s = get();
    if (s.entered) {
      s.library();
      return;
    }
    if (s.chat) {
      s.closeBirthChat();
      return;
    }
    if (s.gate === "library") s.openGalaxy();
  },
}));
