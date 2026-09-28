import type { ResearchChartId } from "@/lib/chart/types";

/** Same sentence as the owner desk when the research table has nothing to open. */
export const EMPTY_DESK_NOTE = "No research charts are on this desk yet.";

/**
 * Parent row in the owner account menu. Joey’s label, apostrophe included.
 * The individual skies open from the submenu under this row.
 */
export const YOUR_SKIES_LABEL = "Your Sky\u2019s";

/** What replaces the old flat sky list in the owner menu. */
export type OwnerSkyMenuMode = "submenu" | "empty" | "checking" | "hidden";

const SKY_LABEL: Record<ResearchChartId, string> = {
  joey: "The sky",
  saige: "Saige’s sky",
};

/**
 * Sky rows for a bound owner. Only charts the desk actually returned.
 * Joey’s sky stays first, then Saige’s — ids the desk does not have are left out.
 */
export function ownerSkyLinks(ids: readonly string[]): { id: ResearchChartId; label: string }[] {
  const have = new Set(ids);
  const links: { id: ResearchChartId; label: string }[] = [];
  if (have.has("joey")) links.push({ id: "joey", label: SKY_LABEL.joey });
  if (have.has("saige")) links.push({ id: "saige", label: SKY_LABEL.saige });
  return links;
}

/**
 * Charts the desk returned nest under “Your Sky’s”.
 * An empty desk keeps the calm note in the owner menu — no parent, no Retry.
 * A desk that has not answered yet says it is checking. A real failure stays
 * with the error row (`hidden` here) so an unseeded desk is never a retry.
 */
export function ownerSkyMenuMode(input: {
  ids: readonly string[] | null;
  deskEmpty: boolean;
  failed: boolean;
}): OwnerSkyMenuMode {
  if (ownerSkyLinks(input.ids ?? []).length > 0) return "submenu";
  if (input.deskEmpty) return "empty";
  if (input.ids === null && !input.failed) return "checking";
  return "hidden";
}
