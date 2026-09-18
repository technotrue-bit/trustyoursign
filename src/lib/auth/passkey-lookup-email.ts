/**
 * Pure email normalization for passkey credential-ID recovery.
 * Kept free of createServerFn so unit tests can import without TanStack Start.
 */
import { isOwnerLogin, SITE_OWNER } from "../owner.ts";

/** Normalize a sign-in identifier to a lowercase email for passkey lookup. */
export function normalizePasskeyLookupEmail(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isOwnerLogin(trimmed)) return SITE_OWNER.email.toLowerCase();
  // Require a plausible email — avoid DB hits on every partial keystroke / name.
  if (!trimmed.includes("@") || trimmed.length > 320) return null;
  const email = trimmed.toLowerCase();
  // Very light shape check; Better Auth stores emails lowercased on sign-up.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
