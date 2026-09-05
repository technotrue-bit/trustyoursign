import type { ThreeEvent } from "@react-three/fiber";
import type { SelectionKind } from "@/lib/chart/types";
import { useSessionStore } from "@/lib/chart/session/store";

export function usePick(kind: SelectionKind, id: string) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!useSessionStore.getState().session) return;
      useSessionStore.getState().select({ kind, id });
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      useSessionStore.getState().hover({ kind, id });
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      const h = useSessionStore.getState().session?.hovered;
      if (h?.kind === kind && h.id === id) useSessionStore.getState().hover(null);
      document.body.style.cursor = "auto";
    },
  };
}
