import { getSql } from "@/lib/db.server";
import { assertSiteOwner } from "@/lib/owner.server";
import type { ResearchChartId } from "../types";
import type { Nativity } from "../schema";

export const assertResearchOwner = assertSiteOwner;

const NOT_SEEDED = "Research chart is not seeded";

function parsePayload(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function asNativity(id: ResearchChartId, payload: unknown): Nativity {
  const parsed = parsePayload(payload);
  if (!parsed || typeof parsed !== "object") throw new Error(NOT_SEEDED);
  const book = parsed as Nativity;
  if (book.id !== id) throw new Error(NOT_SEEDED);
  return book;
}

/** Owner-only. Books live in `research_nativity`, seeded from `seeds/private/`. */
export async function loadResearchNativity(id: ResearchChartId): Promise<Nativity> {
  const sql = await getSql();
  const rows = await sql<{ payload: unknown }>`
    select payload from research_nativity where id = ${id} limit 1
  `;
  if (!rows[0]) throw new Error(NOT_SEEDED);
  return asNativity(id, rows[0].payload);
}

export async function listResearchLibrary() {
  const sql = await getSql();
  const rows = await sql<{ id: string; payload: unknown }>`
    select id, payload from research_nativity order by id
  `;
  const library: { id: ResearchChartId; title: string; oneCut: string; date: string }[] = [];
  for (const row of rows) {
    if (row.id !== "joey" && row.id !== "saige") continue;
    const id: ResearchChartId = row.id;
    const parsed = parsePayload(row.payload);
    if (!parsed || typeof parsed !== "object") continue;
    const meta = (parsed as Nativity).meta;
    library.push({
      id,
      title: meta?.name ?? row.id,
      oneCut: meta?.oneCut ?? "",
      date: meta?.date ?? "",
    });
  }
  return library;
}
