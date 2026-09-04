import type { ChartSession, ClaimDraft, Surface } from "./types";

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

export function isVisitor(session: ChartSession | null): boolean {
  return session?.kind === "visitor";
}

export function isResearch(session: ChartSession | null): boolean {
  return session?.kind === "research";
}

export function isShelf(session: ChartSession | null): boolean {
  return session?.kind === "shelf";
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
