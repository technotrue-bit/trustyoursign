import { getSql, type Sql } from "@/lib/db.server";
import { AppRls } from "@/lib/db-rls.server";
import { readOwnerPassword } from "./owner-password.server";
import {
  accountKey,
  isSiteOwnerIdentity,
  linkedMailboxProof,
  looksLikeOwnerByName,
  ownerEmailAllowList,
  OWNER_USER_ID,
  parseOwnerAccounts,
} from "./owner";

/**
 * Server-side owner gate — IMMUTABLE IDENTITY ONLY. Throws "Not found" (a
 * deliberate non-signal: it never reveals whether the caller was close).
 *
 * Authorization order:
 *   1. the canonical owner row id,
 *   2. the stored binding in `site_state.owner_user_id`,
 *   3. an allowlisted provider account (`OWNER_ACCOUNTS`, `providerId:accountId`),
 *   4. an allowlisted email (`OWNER_EMAILS`) that is verified, or proved by a
 *      linked Google / gate account (X never counts),
 *   5. that same allowlisted email when this row's credential hash matches
 *      `OWNER_PASSWORD` (the operator secret — not a display name, and not
 *      an unverified signup on its own).
 *
 * A display name is never sufficient: it is attacker-controlled on every
 * sign-in path (email/password sign-up and the Google / X profile name behind
 * federated or gate sign-in). The legacy name heuristic survives only as an
 * opt-in, one-time bootstrap (`OWNER_NAME_CLAIM=1`) for an existing owner with
 * no allow list configured — see `looksLikeOwnerByName`.
 */

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

/** Allowlisted owner emails (always includes the canonical account address). */
export function ownerEmails(): string[] {
  return ownerEmailAllowList(env("OWNER_EMAILS"));
}

/** Allowlisted owner accounts, `providerId:accountId`. */
export function ownerAccounts(): string[] {
  return parseOwnerAccounts(env("OWNER_ACCOUNTS"));
}

/** Opt-in escape hatch for bootstrapping a binding from a name. Off by default. */
export function legacyNameClaimEnabled(): boolean {
  return env("OWNER_NAME_CLAIM") === "1";
}

type SiteStateRow = { owner_user_id: string | null; claimed_at: Date | string | null };

async function readSiteState(sql: Sql): Promise<SiteStateRow | null> {
  const rows = await sql<SiteStateRow>`
    select owner_user_id, claimed_at from site_state where id = 'vault' limit 1
  `;
  return rows[0] ?? null;
}

/**
 * Record an immutable binding so later requests are decided by id alone.
 * Only ever replaces the canonical placeholder (or an empty value) — it can
 * never reassign a site that is already bound to a different user.
 */
async function bindOwner(sql: Sql, userId: string): Promise<void> {
  // site_state writes need the bypass: the request flag is only set for the
  // canonical row. This runs after a successful proof so the binding sticks.
  // Claim stays on "Not bound" when the proof itself fails — a dropped update
  // is not what keeps a recognised sign-in on Waiting.
  await AppRls.bypass(
    () => sql`
      update site_state
      set owner_user_id = ${userId}, claimed_at = coalesce(claimed_at, now())
      where id = 'vault'
        and (owner_user_id is null or owner_user_id = ${OWNER_USER_ID})
    `,
  );
}

/** True while no real identity has been bound (canonical placeholder or empty). */
function isUnbound(state: SiteStateRow | null): boolean {
  const bound = state?.owner_user_id ?? null;
  return !bound || bound === OWNER_USER_ID;
}

/** Server-side owner gate: known identity, or an already-recorded binding. */
export async function assertSiteOwner(userId: string) {
  if (!userId) throw new Error("Not found");
  if (userId === OWNER_USER_ID) return;

  const sql = await getSql();
  const state = await readSiteState(sql);

  if (state?.owner_user_id && state.owner_user_id === userId) return;

  const rows = await sql<{ email: string | null; emailVerified: boolean | null; name: string | null }>`
    select "email", "emailVerified", "name" from "user" where "id" = ${userId} limit 1
  `;
  const row = rows[0] ?? null;

  // Always load linked accounts. Mailbox proof needs the provider id even
  // when OWNER_ACCOUNTS is unset.
  const linked = await sql<{ providerId: string; accountId: string }>`
    select "providerId", "accountId" from "account" where "userId" = ${userId}
  `;
  const accounts = linked.map((a) => ({ providerId: a.providerId, accountId: a.accountId }));
  const emails = ownerEmails();

  const authorized = isSiteOwnerIdentity({
    userId,
    boundOwnerId: state?.owner_user_id ?? null,
    email: row?.email ?? null,
    emailVerified: Boolean(row?.emailVerified),
    accounts,
    ownerEmails: emails,
    ownerAccounts: ownerAccounts(),
  });

  if (authorized) {
    if (!row?.emailVerified && linkedMailboxProof(accounts)) {
      // The provider already proved the mailbox; the stored flag was left false.
      try {
        await sql`
          update "user" set "emailVerified" = true, "updatedAt" = now() where "id" = ${userId}
        `;
      } catch (err) {
        console.warn(
          "[owner] mailbox was proved but the verified flag could not be stored",
          err instanceof Error ? err.name : "error",
        );
      }
    }
    if (state && state.owner_user_id !== userId) await bindOwner(sql, userId);
    return;
  }

  // Operator secret on this row. Only when the address is already allowlisted,
  // so a random claim does not pay for a password hash. Does not flip
  // emailVerified — a password is not mailbox proof.
  if (await credentialMatchesOwnerSecret(sql, userId, row?.email, emails)) {
    if (state && state.owner_user_id !== userId) await bindOwner(sql, userId);
    return;
  }

  // Opt-in, one-time bootstrap for an existing owner with no allow list yet.
  if (
    legacyNameClaimEnabled() &&
    isUnbound(state) &&
    looksLikeOwnerByName({ displayName: row?.name, primaryEmail: row?.email })
  ) {
    console.warn(
      "[owner] legacy name claim accepted — set OWNER_EMAILS (or OWNER_ACCOUNTS) and unset " +
        "OWNER_NAME_CLAIM; bound owner_user_id to this identity.",
      { userId, matchedAccounts: linked.map(accountKey) },
    );
    await bindOwner(sql, userId);
    return;
  }

  console.warn("[owner] desk refused", { reason: refusalReason(row, emails) });
  throw new Error("Not found");
}

/**
 * True when this row's credential hash is the operator secret.
 * Returns false immediately unless the address is allowlisted, so other
 * claims never pay for a password hash.
 */
async function credentialMatchesOwnerSecret(
  sql: Sql,
  userId: string,
  email: string | null | undefined,
  emails: readonly string[],
): Promise<boolean> {
  const address = (email ?? "").trim().toLowerCase();
  if (!address || !emails.includes(address)) return false;
  const password = readOwnerPassword();
  if (!password) return false;
  const acc = await sql<{ password: string | null }>`
    select "password" from "account"
    where "userId" = ${userId} and "providerId" = 'credential'
    limit 1
  `;
  const hash = acc[0]?.password;
  if (!hash) return false;
  try {
    const { verifyPassword } = await import("better-auth/crypto");
    return await verifyPassword({ hash, password });
  } catch {
    return false;
  }
}

function refusalReason(
  row: { email: string | null; emailVerified: boolean | null } | null,
  emails: readonly string[],
): "no-row" | "email-mismatch" | "unverified-email" | "no-proof" {
  if (!row) return "no-row";
  const address = (row.email ?? "").trim().toLowerCase();
  if (!address || !emails.includes(address)) return "email-mismatch";
  if (!row.emailVerified) return "unverified-email";
  return "no-proof";
}
