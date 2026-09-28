import type { Nativity } from "../schema";
import type { ResearchChartId } from "../types";

/** Stable message for an empty or unreadable research book. Not a network failure. */
export const RESEARCH_CHART_NOT_SEEDED = "Research chart is not seeded";

export function parseResearchPayload(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * A stored book the desk can open.
 * Null when the row is missing, torn, or belongs to a different chart.
 */
export function readResearchBook(id: ResearchChartId, payload: unknown): Nativity | null {
  const parsed = parseResearchPayload(payload);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const book = parsed as Nativity;
  if (book.id !== id) return null;
  if (!book.meta || typeof book.meta !== "object") return null;
  return book;
}
