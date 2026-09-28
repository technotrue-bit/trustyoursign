import { getSql } from "@/lib/db.server";
import { assertSiteOwner } from "@/lib/owner.server";
import type { ResearchChartId } from "../types";
import type { Nativity } from "../schema";
import { readResearchBook, RESEARCH_CHART_NOT_SEEDED } from "./read";

export const assertResearchOwner = assertSiteOwner;

function notSeeded(): never {
  throw new Error(RESEARCH_CHART_NOT_SEEDED);
}

/** Owner-only. Books live in `research_nativity`, seeded from `seeds/private/`. */
export async function loadResearchNativity(id: ResearchChartId): Promise<Nativity> {
  const sql = await getSql();
  let rows: { payload: unknown }[];
  try {
    rows = await sql<{ payload: unknown }>`
      select payload from research_nativity where id = ${id} limit 1
    `;
  } catch (err) {
    // No table yet is an empty desk. The menu must not treat it as a dropped connection.
    if (isMissingResearchTable(err)) {
      console.info("[research] chart table is not there yet");
      notSeeded();
    }
    const message = err instanceof Error ? err.message : "chart read failed";
    console.error("[research] chart read failed", message.slice(0, 200));
    throw err;
  }
  const book = rows[0] ? readResearchBook(id, rows[0].payload) : null;
  if (!book) {
    // Id only — never the payload. Birth data stays in the row.
    console.info("[research] chart is not on the desk", id);
    notSeeded();
  }
  return book;
}

function isMissingResearchTable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /research_nativity/i.test(message) && /does not exist|undefined_table|42P01/i.test(message);
}

export async function listResearchLibrary() {
  const sql = await getSql();
  let rows: { id: string; payload: unknown }[];
  try {
    rows = await sql<{ id: string; payload: unknown }>`
      select id, payload from research_nativity order by id
    `;
  } catch (err) {
    // No table yet is an empty desk, not a failed open. Other errors still throw.
    if (isMissingResearchTable(err)) return [];
    throw err;
  }
  const library: { id: ResearchChartId; title: string; oneCut: string; date: string }[] = [];
  for (const row of rows) {
    if (row.id !== "joey" && row.id !== "saige") continue;
    const id: ResearchChartId = row.id;
    const book = readResearchBook(id, row.payload);
    if (!book) continue;
    library.push({
      id,
      title: book.meta.name || id,
      oneCut: book.meta.oneCut ?? "",
      date: book.meta.date ?? "",
    });
  }
  return library;
}
