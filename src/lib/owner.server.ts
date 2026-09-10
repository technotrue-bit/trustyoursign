import { getSql } from "@/lib/db.server";
import { isSiteOwner, OWNER_USER_ID, SITE_OWNER } from "./owner";

/** Server-side owner gate: known owner id, or matching user row. Throws "Not found". */
export async function assertSiteOwner(userId: string) {
  if (userId === OWNER_USER_ID) return;
  const sql = await getSql();
  const rows = await sql<{ email: string | null; name: string | null }>`
    select email, name from "user" where id = ${userId} limit 1
  `;
  const row = rows[0];
  if (isSiteOwner({ displayName: row?.name, primaryEmail: row?.email })) return;
  if (row?.email?.toLowerCase() === SITE_OWNER.email) return;
  throw new Error("Not found");
}
