import { getSql, type Sql } from "@/lib/db.server";
import { AppRls } from "@/lib/db-rls.server";
import {
  accountKey,
  isSiteOwnerIdentity,
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
 *   4. an allowlisted, VERIFIED email (`OWNER_EMAILS`).
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
  // site_state writes require the bypass (or the canonical owner flag). This
  // runs after the identity check, inside the caller's user context, where
  // that flag is only set for the placeholder row. Without the bypass the
  // update matches nothing and Claim stays on Waiting.
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

  const allowedAccounts = ownerAccounts();
  const linked = allowedAccounts.length
    ? await sql<{ providerId: string; accountId: string }>`
        select "providerId", "accountId" from "account" where "userId" = ${userId}
      `
    : [];

  const authorized = isSiteOwnerIdentity({
    userId,
    boundOwnerId: state?.owner_user_id ?? null,
    email: row?.email ?? null,
    emailVerified: Boolean(row?.emailVerified),
    accounts: linked.map((a) => ({ providerId: a.providerId, accountId: a.accountId })),
    ownerEmails: ownerEmails(),
    ownerAccounts: allowedAccounts,
  });

  if (authorized) {
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

  throw new Error("Not found");
}
