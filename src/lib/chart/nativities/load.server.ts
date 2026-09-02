import { OWNER_USER_ID, SITE_OWNER, isSiteOwner } from "@/lib/owner";
import { getSql } from "@/lib/db";
import type { ChartId } from "../types";
import type { Nativity } from "../schema";
import { SAIGE } from "./saige";
import { JOEY } from "./joey";

const RESEARCH: Record<ChartId, Nativity> = { saige: SAIGE, joey: JOEY };

export function loadResearchNativity(id: ChartId): Nativity {
  return RESEARCH[id];
}

export function listResearchLibrary() {
  return (Object.values(RESEARCH) as Nativity[]).map((n) => ({
    id: n.id,
    title: n.meta.name,
    oneCut: n.meta.oneCut,
    date: n.meta.date,
  }));
}

export async function assertResearchOwner(userId: string) {
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
