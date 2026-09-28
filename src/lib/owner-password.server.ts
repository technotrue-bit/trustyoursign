import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The operator secret (`OWNER_PASSWORD`). The legacy value "True" is ignored
 * so a known-compromised password cannot open the desk.
 * Server-only — never import this from a client component.
 */
const COMPROMISED = "True";

export function readOwnerPassword(): string | undefined {
  const value = process.env.OWNER_PASSWORD?.trim();
  if (!value) return undefined;
  if (value === COMPROMISED) {
    console.error(
      '[owner] OWNER_PASSWORD is the compromised legacy value "True" — ignoring it. ' +
        "Set a new password in the host environment, or owner sign-in stays off.",
    );
    return undefined;
  }
  return value;
}

/** Timing-safe equality for the operator secret. Empty inputs never match. */
export function ownerPasswordMatches(submitted: string, expected: string): boolean {
  if (!submitted || !expected) return false;
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
