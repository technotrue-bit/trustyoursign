import { useSessionStore } from "./store";
import type { ChartSession, ClaimDraft, SessionKind, Surface } from "./types";
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { AppMode, Selection } from "@/lib/chart/types";

export function useSession(): ChartSession | null {
  return useSessionStore((s) => s.session);
}

export function useNativity(): Nativity | null {
  return useSessionStore((s) => s.session?.nativity ?? null);
}

export function useClaim(): ClaimDraft | null {
  return useSessionStore((s) => s.claim);
}

export function useSurface(): Surface {
  return useSessionStore((s) => s.surface);
}

export function useSessionMode(): AppMode {
  return useSessionStore((s) => s.session?.mode ?? "sky");
}

export function useSessionSelection(): Selection {
  return useSessionStore((s) => s.session?.selection ?? null);
}

export function useSessionHovered(): Selection {
  return useSessionStore((s) => s.session?.hovered ?? null);
}

export function useIsEntered(): boolean {
  return useSessionStore((s) => s.session !== null);
}

export function useSessionKind(): SessionKind | null {
  return useSessionStore((s) => s.session?.kind ?? null);
}

export function useSkyNatal(): SkyNatal | null {
  return useSessionStore((s) => s.session?.skyNatal ?? null);
}

export function useTourBeat(): string | null {
  return useSessionStore((s) => s.session?.tourBeat ?? null);
}

export function useSheetFolded(): boolean {
  return useSessionStore((s) => s.session?.sheetFolded ?? false);
}
