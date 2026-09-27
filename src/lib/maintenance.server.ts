import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db.server";
import { AppRls } from "@/lib/db-rls.server";
import { assertSiteOwner } from "@/lib/owner.server";
import type { MaintenanceGate } from "./maintenance";

const TTL_MS = 2_000;
let cached: { on: boolean; at: number } | null = null;

export function clearMaintenanceCache() {
  cached = null;
}

export async function readMaintenance(): Promise<boolean> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.on;
  const sql = await getSql();
  const rows = await sql<{ maintenance: boolean | null }>`
    select maintenance from site_state where id = 'vault' limit 1
  `;
  const on = Boolean(rows[0]?.maintenance);
  cached = { on, at: Date.now() };
  return on;
}

export async function writeMaintenance(on: boolean): Promise<void> {
  clearMaintenanceCache();
  await AppRls.bypass(async () => {
    const sql = await getSql();
    await sql`
      update site_state set maintenance = ${on} where id = 'vault'
    `;
  });
  cached = { on, at: Date.now() };
}

/**
 * Fail open: if the flag cannot be read, leave the sky up.
 * Owner bypass uses the same identity check as the rest of the desk.
 */
export async function maintenanceGate(bearerToken?: string): Promise<MaintenanceGate> {
  try {
    const on = await readMaintenance();
    if (!on) return { on: false, bypass: false };
    const user = await getSessionUser(bearerToken);
    if (!user) return { on: true, bypass: false };
    try {
      await assertSiteOwner(user.id);
      return { on: true, bypass: true };
    } catch {
      return { on: true, bypass: false };
    }
  } catch (err) {
    console.error("[maintenance] could not read the flag", err);
    return { on: false, bypass: false };
  }
}
