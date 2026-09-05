import type { ThreeEvent } from "@react-three/fiber";
import type { SelectionKind } from "@/lib/chart/types";
import { useVault } from "@/lib/store";
import { useSceneHover } from "./hover";

export { useSceneHover } from "./hover";

export function usePick(kind: SelectionKind, id: string) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!useVault.getState().entered) return;
      useVault.getState().select({ kind, id });
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      useVault.getState().hover({ kind, id });
      useSceneHover.getState().set({ kind, id });
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      const h = useVault.getState().hovered;
      if (h?.kind === kind && h.id === id) useVault.getState().hover(null);
      const sh = useSceneHover.getState().hovered;
      if (sh?.kind === kind && sh.id === id) useSceneHover.getState().set(null);
      document.body.style.cursor = "auto";
    },
  };
}
