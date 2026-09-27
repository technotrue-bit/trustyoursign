/** Cohort stored on the account. `beta` is a mark only — nothing is gated on it yet. */
export const ACCOUNT_ROLES = ["user", "beta"] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export function isAccountRole(value: unknown): value is AccountRole {
  return value === "user" || value === "beta";
}

/** Unknown or missing values read as a regular account. */
export function asAccountRole(value: unknown): AccountRole {
  return value === "beta" ? "beta" : "user";
}
