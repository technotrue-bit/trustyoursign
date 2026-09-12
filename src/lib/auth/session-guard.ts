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
