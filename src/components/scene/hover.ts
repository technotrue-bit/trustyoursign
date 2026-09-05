import { create } from "zustand";
import type { SelectionKind } from "@/lib/chart/types";

export type HoverSel = { kind: SelectionKind; id: string } | null;

/** Isolated from vault Chrome — hover hint re-renders alone (B4). No three/R3F. */
export const useSceneHover = create<{ hovered: HoverSel; set: (h: HoverSel) => void }>((set) => ({
  hovered: null,
  set: (hovered) => set({ hovered }),
}));
