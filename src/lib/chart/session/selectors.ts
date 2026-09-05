import type { ChartSession, ClaimDraft, Surface } from "./types";

export type ShelfSession = ChartSession & { kind: "shelf" };

export function isEntered(session: ChartSession | null): boolean {
  return session !== null;
}

export function nativityOf(session: ChartSession | null) {
  return session?.nativity ?? null;
}

export function skyNatalOf(session: ChartSession | null) {
  return session?.skyNatal ?? null;
}

export function originOf(session: ChartSession | null): Surface | null {
  return session?.origin ?? null;
}

export function sessionKindOf(session: ChartSession | null) {
  return session?.kind ?? null;
}

export function chartKeyOf(session: ChartSession | null) {
  return session?.chartKey ?? null;
}

export function sessionModeOf(session: ChartSession | null) {
  return session?.mode ?? "sky";
}

export function sessionSelectionOf(session: ChartSession | null) {
  return session?.selection ?? null;
}

export function sessionHoveredOf(session: ChartSession | null) {
  return session?.hovered ?? null;
}

export function tourBeatOf(session: ChartSession | null): string | null {
  return session?.tourBeat ?? null;
}

export function sheetFoldedOf(session: ChartSession | null): boolean {
  return session?.sheetFolded ?? false;
}

export function shelfSessionOf(session: ChartSession | null): ShelfSession | null {
  return session?.kind === "shelf" ? (session as ShelfSession) : null;
}

/** Ignore interaction-only replacements when a component reads shelf identity/content. */
export function equalShelfSession(a: ShelfSession | null, b: ShelfSession | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.chartKey === b.chartKey &&
    a.savedId === b.savedId &&
    a.label === b.label &&
    a.relation === b.relation &&
    a.personName === b.personName &&
    a.signId === b.signId &&
    a.tone === b.tone &&
    a.birth === b.birth &&
    a.nativity === b.nativity &&
    a.skyNatal === b.skyNatal &&
    a.origin === b.origin
  );
}

export type CloseTarget = {
  surface: Surface;
  clearClaim: boolean;
};

/** Mirrors today's goBack priority without UI: session → claim → library-to-galaxy. */
export function closeTarget(state: {
  session: ChartSession | null;
  claim: ClaimDraft | null;
  surface: Surface;
}): CloseTarget {
  if (state.session) {
    return { surface: state.session.origin, clearClaim: true };
  }
  if (state.claim) {
    return { surface: state.surface, clearClaim: true };
  }
  if (state.surface === "library") {
    return { surface: "galaxy", clearClaim: false };
  }
  return { surface: "galaxy", clearClaim: false };
}
