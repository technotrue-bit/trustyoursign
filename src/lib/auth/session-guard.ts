export type SessionGuardState = "loading" | "unavailable" | "signed_in" | "signed_out";

export type SessionGuardInput = {
  isPending: boolean;
  /** The session READ failed (network/server hiccup) — not the same as "no session". */
  isReadFailed: boolean;
  hasUser: boolean;
};

/**
 * Decide what a guarded route should do about the visitor's session.
 *
 * The distinction that matters: "we asked and there is no session" is SIGNED
 * OUT, while "we could not ask" is UNAVAILABLE. Treating the second as the first
 * signs people out over a dropped request — on a phone waking from the app
 * switcher, the session refetch on focus is exactly the request that fails — and
 * because the sign-in page then has no reason to move them along, they are
 * stranded at sign-in with a perfectly good cookie.
 *
 * So: only a definite answer sends anyone to sign-in.
 */
export function resolveSessionGuardState(input: SessionGuardInput): SessionGuardState {
  if (input.hasUser) return "signed_in";
  if (input.isPending) return "loading";
  if (input.isReadFailed) return "unavailable";
  return "signed_out";
}

/**
 * How long a definite empty read stays on the checking screen before sign-in.
 * Long enough for a cookie that is still landing after email sign-in, short
 * enough that a real sign-out still leaves the page.
 */
export const SIGNED_OUT_GRACE_MS = 600;

export type SessionGateView = "loading" | "unavailable" | "redirect" | "ready";

/**
 * What the one session gate should paint.
 *
 * A failed read is "couldn't check", even while the sign-out hold is open —
 * it must not look like sign-in. The hold itself must not send anyone to
 * sign-in early: the first empty read after a fresh sign-in is often the
 * cookie still settling.
 */
export function resolveSessionGateView(input: {
  guard: SessionGuardState;
  graceOpen: boolean;
}): SessionGateView {
  if (input.guard === "signed_in") return "ready";
  if (input.guard === "unavailable") return "unavailable";
  if (input.guard === "loading" || input.graceOpen) return "loading";
  return "redirect";
}

export type SessionGateMemory = {
  /** Last guard this gate has folded in. `null` before the first paint. */
  guard: SessionGuardState | null;
  graceOpen: boolean;
  /** A session re-read was already asked for on this visit. */
  recheckConsumed: boolean;
  /** The gate still owes that one re-read. Cleared once it is sent. */
  refetchOwed: boolean;
};

export const initialSessionGateMemory: SessionGateMemory = {
  guard: null,
  graceOpen: true,
  recheckConsumed: false,
  refetchOwed: false,
};

export type SessionGateEvent =
  | { type: "observe"; guard: SessionGuardState }
  | { type: "graceElapsed" };

/**
 * Fold one observation into the session gate.
 *
 * Entering "signed out" opens the hold in the same step that picks the view,
 * so the paint that first sees an empty read does not bounce to sign-in.
 * The re-read is owed at most once per visit. A new refetch function on every
 * render, or a loading flicker after Log out, must not ask again — that
 * repeat is what flooded `/get-session`.
 */
export function reduceSessionGate(
  memory: SessionGateMemory,
  event: SessionGateEvent,
): { memory: SessionGateMemory; view: SessionGateView } {
  if (event.type === "graceElapsed") {
    const guard = memory.guard ?? "loading";
    if (!memory.graceOpen) {
      return { memory, view: resolveSessionGateView({ guard, graceOpen: false }) };
    }
    const next: SessionGateMemory = { ...memory, graceOpen: false };
    return { memory: next, view: resolveSessionGateView({ guard, graceOpen: false }) };
  }

  const { guard } = event;
  const enteredSignedOut = guard === "signed_out" && memory.guard !== "signed_out";
  let graceOpen = memory.graceOpen;
  let recheckConsumed = memory.recheckConsumed;
  let refetchOwed = memory.refetchOwed;

  if (enteredSignedOut) {
    graceOpen = true;
    if (!recheckConsumed) {
      recheckConsumed = true;
      refetchOwed = true;
    }
  } else if (guard !== "signed_out") {
    graceOpen = false;
  }

  const view = resolveSessionGateView({ guard, graceOpen });
  if (
    guard === memory.guard &&
    graceOpen === memory.graceOpen &&
    recheckConsumed === memory.recheckConsumed &&
    refetchOwed === memory.refetchOwed
  ) {
    return { memory, view };
  }
  return {
    memory: { guard, graceOpen, recheckConsumed, refetchOwed },
    view,
  };
}
