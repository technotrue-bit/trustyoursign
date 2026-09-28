import type { ResearchChartId } from "@/lib/chart/types";

/** Same sentence as the owner desk when the research table has nothing to open. */
export const EMPTY_DESK_NOTE = "No research charts are on this desk yet.";

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
