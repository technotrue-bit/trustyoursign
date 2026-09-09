import type { AppUser } from "@/lib/auth/use-current-user";

export const SITE_OWNER = {
  name: "Devin Norris",
  handle: "ItsMeTrueG",
  login: "ADMIN",
  email: "admin@thevault.app",
  role: "Owner",
} as const;

export const OWNER_USER_ID = "vault-owner-devin";

function compact(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isOwnerLogin(identifier: string) {
  const c = compact(identifier);
  return c === "admin" || c === "admintrue" || c === compact(SITE_OWNER.email);
}

/** True when this session is the site owner. */
export function isSiteOwner(
  user: Pick<AppUser, "displayName" | "primaryEmail"> | { email?: string | null; name?: string | null } | null,
) {
  if (!user) return false;
  const email = (
    ("primaryEmail" in user ? user.primaryEmail : null) ||
    ("email" in user ? user.email : null) ||
    ""
  ).toLowerCase();
  if (email === SITE_OWNER.email) return true;
  const bits = [
    "displayName" in user ? user.displayName : null,
    "name" in user ? user.name : null,
    email,
  ]
    .filter(Boolean)
    .join(" ");
  const c = compact(bits);
  if (!c) return false;
  return c.includes(compact(SITE_OWNER.name)) || c.includes(compact(SITE_OWNER.handle));
}

/** Server-side owner gate: known owner id, or matching user row. Throws "Not found". */
export async function assertSiteOwner(userId: string) {
  if (userId === OWNER_USER_ID) return;
  // Dynamic import keeps @/lib/db out of client bundles that only need isSiteOwner.
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ email: string | null; name: string | null }>`
    select email, name from "user" where id = ${userId} limit 1
  `;
  const row = rows[0];
  if (isSiteOwner({ displayName: row?.name, primaryEmail: row?.email })) return;
  if (row?.email?.toLowerCase() === SITE_OWNER.email) return;
  throw new Error("Not found");
}
