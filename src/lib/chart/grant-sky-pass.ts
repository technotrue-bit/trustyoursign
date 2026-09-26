import type { Sql } from "@/lib/db";

export type SkyPassEntitlement = "free" | "bones" | "vault";

export type GrantSkyPassResult = { ok: true } | { ok: false; error: "No such user" };

/**
 * Owner grant. Looks up `"user"` first and only writes `sky_pass` — and only
 * reports success — when that row exists. `sky_pass.user_id` has no foreign
 * key, so an unknown id used to insert a pass and look like a grant.
 */
export function asSkyPassEntitlement(value: string): SkyPassEntitlement {
  return value === "bones" || value === "vault" ? value : "free";
}

export async function grantSkyPassForUser(
  sql: Sql,
  userId: string,
  entitlement: string,
): Promise<GrantSkyPassResult> {
  const id = userId.trim();
  const pass = asSkyPassEntitlement(entitlement);
  if (!id) return { ok: false, error: "No such user" };
  const users = await sql<{ id: string }>`
    select "id" from "user" where "id" = ${id} limit 1
  `;
  if (!users[0]) return { ok: false, error: "No such user" };
  await sql`
    insert into sky_pass (user_id, entitlement, updated_at)
    values (${id}, ${pass}, now())
    on conflict (user_id) do update set entitlement = ${pass}, updated_at = now()
  `;
  return { ok: true };
}
