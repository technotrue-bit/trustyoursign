import type { AccountRole } from "./account-role";

/** Visitor-facing name for an account marked `beta`. */
export const CLOSED_BETA_TESTER_NAME = "Closed Beta Tester";

export function isClosedBetaTester(role: AccountRole | null | undefined): boolean {
  return role === "beta";
}

/**
 * Accessible name for the account control.
 * A regular account stays "Account". A beta account names the mark in full,
 * including on the phone HUD where the words sit in a narrow stack.
 */
export function accountTriggerName(role: AccountRole | null | undefined): string {
  return isClosedBetaTester(role) ? `Account, ${CLOSED_BETA_TESTER_NAME}` : "Account";
}

/** One word per line for the narrow stack under the avatar. */
export function closedBetaTesterLines(name: string = CLOSED_BETA_TESTER_NAME): string[] {
  return name.split(" ").filter((word) => word.length > 0);
}
