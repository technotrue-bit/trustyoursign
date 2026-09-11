import type { AppUser } from "@/lib/auth/use-current-user";

export const SITE_OWNER = {
  name: "Devin Norris",
  handle: "ItsMeTrueG",
  login: "ADMIN",
  email: "admin@thevault.app",
  role: "Owner",
} as const;

/** Canonical owner row id (the local credential account seeded by `site.server`). */
export const OWNER_USER_ID = "vault-owner-devin";

function compact(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function norm(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Owner authorization — IMMUTABLE IDENTITY ONLY.
 *
 * A display name is attacker-controlled on every sign-in path (email/password
 * sign-up, and the Google / X profile name behind federated or gate sign-in),
 * so it can never be the basis of an authorization decision: a visitor whose
 * profile name happens to read "Devin Norris" would otherwise pass the same
 * server-side owner gate as the owner himself.
 *
 * These pure predicates take their inputs explicitly (no `process.env` here —
 * this module is imported by client components). Server-side env parsing and
 * the DB lookups live in `owner.server.ts`.
 *
 * Authoritative, in order of strength:
 *   1. `OWNER_ACCOUNTS`  — `providerId:accountId` pairs; the upstream provider's
 *      immutable subject id for the owner's Google / X account.
 *   2. `OWNER_EMAILS`    — allowlisted emails, honoured ONLY when the identity
 *      is verified (synthetic/unverified X emails never match).
 *   3. the stored binding — `site_state.owner_user_id` once the owner has been
 *      recognised, so later requests are decided by id alone.
 *   4. `OWNER_USER_ID`   — the canonical local credential account.
 */

/** Parse a comma/whitespace separated email allow list into lowercase entries. */
export function parseOwnerEmails(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/[\s,]+/)
    .map((s) => norm(s))
    .filter(Boolean);
}

/** Parse `providerId:accountId[, …]` pairs. Entries missing a colon are dropped. */
export function parseOwnerAccounts(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes(":"))
    .map((s) => {
      const i = s.indexOf(":");
      return `${s.slice(0, i)}:${s.slice(i + 1)}`;
    })
    .filter((s) => !s.startsWith(":") && !s.endsWith(":"));
}

/** `providerId:accountId` for one linked account row. */
export function accountKey(a: { providerId: string; accountId: string }) {
  return `${a.providerId}:${a.accountId}`;
}

export type OwnerIdentityInput = {
  /** Verified session user id. */
  userId?: string | null;
  /** `site_state.owner_user_id`, when already bound. */
  boundOwnerId?: string | null;
  email?: string | null;
  /** From the `user` row / session — an allowlisted email must be verified. */
  emailVerified?: boolean;
  /** Linked provider accounts for this user. */
  accounts?: readonly { providerId: string; accountId: string }[];
  /** Parsed `OWNER_EMAILS` (see `parseOwnerEmails`). */
  ownerEmails?: readonly string[];
  /** Parsed `OWNER_ACCOUNTS` (see `parseOwnerAccounts`). */
  ownerAccounts?: readonly string[];
};

/**
 * True when this identity is the site owner, by immutable identifier only.
 * A display name is never consulted — pass one in and it is ignored.
 */
export function isSiteOwnerIdentity(input: OwnerIdentityInput): boolean {
  const userId = input.userId ? input.userId.trim() : "";
  if (!userId) return false;

  // The canonical local credential account.
  if (userId === OWNER_USER_ID) return true;

  // Already bound to this user on a previous, verified claim.
  const bound = input.boundOwnerId ? input.boundOwnerId.trim() : "";
  if (bound && bound === userId) return true;

  // Immutable provider subject id.
  const accounts = input.ownerAccounts ?? [];
  if (accounts.length > 0) {
    const keys = (input.accounts ?? []).map(accountKey);
    if (keys.some((k) => accounts.includes(k))) return true;
  }

  // Allowlisted email, verified only.
  const emails = input.ownerEmails ?? [];
  if (emails.length > 0 && input.emailVerified) {
    const email = norm(input.email);
    if (email && emails.includes(email)) return true;
  }

  return false;
}

/**
 * The owner's email allow list always includes the canonical account address —
 * it is the row `OwnerAccount.ensure()` seeds, and Better Auth's unique email
 * constraint means no other account can take it.
 */
export function ownerEmailAllowList(raw: string | null | undefined): string[] {
  const parsed = parseOwnerEmails(raw);
  return parsed.includes(SITE_OWNER.email) ? parsed : [SITE_OWNER.email, ...parsed];
}

/**
 * LEGACY, NON-AUTHORITATIVE name heuristic — kept only so an existing owner can
 * bootstrap a binding when no allow list is configured yet (opt-in via
 * `OWNER_NAME_CLAIM=1`, one time only; see `owner.server.ts`).
 *
 * Never use this for authorization on its own: it reads a user-editable name.
 * Matching is deliberately narrow — the whole compacted name, or the name/handle
 * as a WHOLE token — so "Devin Norris Fan" and "Not Devin Norris" no longer
 * qualify, unlike the substring test this replaces.
 *
 * It is named so call sites read as the guess they are.
 */
export function looksLikeOwnerByName(
  user:
    | {
        displayName?: string | null;
        name?: string | null;
        primaryEmail?: string | null;
        email?: string | null;
      }
    | null,
): boolean {
  if (!user) return false;
  const name = "displayName" in user ? user.displayName : ("name" in user ? user.name : null);
  const raw = [name, "primaryEmail" in user ? user.primaryEmail : null, "email" in user ? user.email : null]
    .filter(Boolean)
    .join(" ");
  if (!raw.trim()) return false;
  // Whole-string equality ("Devin Norris" -> "devinnorris").
  if (compact(raw) === compact(SITE_OWNER.name)) return true;
  // Or the name/handle standing alone as one token ("ItsMeTrueG", "Devin-Norris").
  const wanted = new Set([compact(SITE_OWNER.name), compact(SITE_OWNER.handle)]);
  return raw
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .some((token) => wanted.has(compact(token)));
}

/**
 * Client-side display check for owner chrome. Cosmetic only — components must
 * treat a server answer (`claimSite()` → `owner`) as the source of truth.
 * Identity-based, so it can never be satisfied by a display name alone.
 */
export function isSiteOwner(
  user: Pick<AppUser, "id" | "displayName" | "primaryEmail"> | null,
): boolean {
  if (!user) return false;
  if (user.id === OWNER_USER_ID) return true;
  return norm(user.primaryEmail) === SITE_OWNER.email;
}

/**
 * Owner sign-in identifier alias — routing only (maps the short `ADMIN` login to
 * the canonical owner address). It grants nothing on its own: the password is
 * still required, and the resulting session must pass `isSiteOwnerIdentity`.
 */
export function isOwnerLogin(identifier: string) {
  const c = compact(identifier);
  return c === "admin" || c === "admintrue" || c === compact(SITE_OWNER.email);
}
