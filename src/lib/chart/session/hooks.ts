import { useStoreWithEqualityFn } from "zustand/traditional";
import { useSessionStore } from "./store";
import type { ChartSession, ClaimDraft, SessionKind, Surface } from "./types";
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { AppMode, Selection } from "@/lib/chart/types";
import {
  chartKeyOf,
  equalShelfSession,
  isEntered,
  nativityOf,
  originOf,
  sessionHoveredOf,
  sessionKindOf,
  sessionModeOf,
  sessionSelectionOf,
  shelfSessionOf,
  sheetFoldedOf,
  skyNatalOf,
  tourBeatOf,
  type ShelfSession,
} from "./selectors";

export function useSession(): ChartSession | null {
  return useSessionStore((s) => s.session);
}

export function useNativity(): Nativity | null {
  return useSessionStore((s) => nativityOf(s.session));
}

export function useClaim(): ClaimDraft | null {
  return useSessionStore((s) => s.claim);
}

export function useSurface(): Surface {
  return useSessionStore((s) => s.surface);
}

export function useSessionOrigin(): Surface | null {
  return useSessionStore((s) => originOf(s.session));
}

export function useSessionMode(): AppMode {
  return useSessionStore((s) => sessionModeOf(s.session));
}

export function useSessionSelection(): Selection {
  return useSessionStore((s) => sessionSelectionOf(s.session));
}

export function useSessionHovered(): Selection {
  return useSessionStore((s) => sessionHoveredOf(s.session));
}

export function useIsEntered(): boolean {
  return useSessionStore((s) => isEntered(s.session));
}

export function useSessionKind(): SessionKind | null {
  return useSessionStore((s) => sessionKindOf(s.session));
}

export function useSessionChartKey(): string | null {
  return useSessionStore((s) => chartKeyOf(s.session));
}

export function useShelfSession(): ShelfSession | null {
  return useStoreWithEqualityFn(
    useSessionStore,
    (s) => shelfSessionOf(s.session),
    equalShelfSession,
  );
}

export function useSkyNatal(): SkyNatal | null {
  return useSessionStore((s) => skyNatalOf(s.session));
}

export function useTourBeat(): string | null {
  return useSessionStore((s) => tourBeatOf(s.session));
}

export function useSheetFolded(): boolean {
  return useSessionStore((s) => sheetFoldedOf(s.session));
}
