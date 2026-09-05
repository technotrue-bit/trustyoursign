import type { AppMode, Selection, SignId } from "@/lib/chart/types";
import { closeTarget } from "./selectors";
import type { BirthFacts, ChartSession, ClaimDraft, Surface } from "./types";

export type VaultDomainState = {
  session: ChartSession | null;
  claim: ClaimDraft | null;
  surface: Surface;
};

export function openSessionState(
  state: VaultDomainState,
  session: ChartSession,
): VaultDomainState {
  return { session, claim: null, surface: session.origin };
}

export function patchSessionState(
  state: VaultDomainState,
  patch: Partial<ChartSession>,
): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, ...patch } };
}

export function applyCloseState(state: VaultDomainState): VaultDomainState {
  const target = closeTarget(state);
  return {
    session: null,
    claim: target.clearClaim ? null : state.claim,
    surface: target.surface,
  };
}

export function openClaimState(state: VaultDomainState, signId: SignId): VaultDomainState {
  return {
    session: null,
    claim: { signId, birth: null },
    surface: "galaxy",
  };
}

export function clearClaimState(state: VaultDomainState): VaultDomainState {
  return { ...state, claim: null };
}

export function setClaimBirthState(
  state: VaultDomainState,
  birth: BirthFacts,
): VaultDomainState {
  if (!state.claim) return state;
  return { ...state, claim: { ...state.claim, birth } };
}

export function setSurfaceState(state: VaultDomainState, surface: Surface): VaultDomainState {
  return {
    session: null,
    claim: null,
    surface,
  };
}

export function setModeState(state: VaultDomainState, mode: AppMode): VaultDomainState {
  if (!state.session) return state;
  if (mode === "ask") {
    return { ...state, session: { ...state.session, mode, hovered: null } };
  }
  return {
    ...state,
    session: { ...state.session, mode, selection: null, hovered: null },
  };
}

export function setSelectionState(
  state: VaultDomainState,
  selection: Selection,
): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, selection } };
}

export function setHoverState(state: VaultDomainState, hovered: Selection): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, hovered } };
}

export function clearSelectionState(state: VaultDomainState): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, selection: null } };
}

export function foldSheetState(state: VaultDomainState, folded: boolean): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, sheetFolded: folded } };
}

export function nextTourState(
  state: VaultDomainState,
  next: { id: string; mode: AppMode; selection: Selection } | null,
): VaultDomainState {
  if (!state.session) return state;
  if (!next) {
    return { ...state, session: { ...state.session, tourBeat: null } };
  }
  return {
    ...state,
    session: {
      ...state.session,
      tourBeat: next.id,
      mode: next.mode,
      selection: next.selection,
      hovered: null,
    },
  };
}

export function skipTourState(state: VaultDomainState): VaultDomainState {
  if (!state.session) return state;
  return { ...state, session: { ...state.session, tourBeat: null } };
}
