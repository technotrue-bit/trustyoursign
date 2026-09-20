import type { SavedChart, ChartSummary } from "./charts";

/** LocalStorage / guest Ask key used before a charts row exists. */
export const GUEST_ASK_KEY = "visitor";

export function asChartKey(k: string) {
  const v = k.trim().toLowerCase();
  if (v === "visitor") throw new Error("Unknown chart");
  if (v === "saige" || v === "joey") return v;
  if (/^[0-9a-f-]{8,64}$/.test(v)) return v;
  if (/^shelf-\d{6,}$/.test(v)) return v;
  throw new Error("Unknown chart");
}

/** Timed natal: full SavedChart uses natal payload; ChartSummary uses hasTimedNatal flag. */
export function hasTimedNatal(
  chart:
    | Pick<SavedChart, "natal" | "birthHour" | "birthMinute" | "birthPlace">
    | Pick<ChartSummary, "hasTimedNatal" | "birthHour" | "birthMinute" | "birthPlace">,
): boolean {
  if ("hasTimedNatal" in chart && !("natal" in chart)) {
    return chart.hasTimedNatal;
  }
  const full = chart as Pick<SavedChart, "natal" | "birthHour" | "birthMinute" | "birthPlace">;
  return Boolean(
    full.natal &&
      full.birthHour != null &&
      full.birthMinute != null &&
      full.birthPlace,
  );
}

/**
 * The chart the account menu's "The sky" opens when nothing is open yet: the
 * viewer's own chart, else the newest one (rows arrive newest first).
 */
export function pickSkyChart<T extends Pick<SavedChart, "relation">>(charts: readonly T[]): T | null {
  if (charts.length === 0) return null;
  return charts.find((c) => c.relation === "self") ?? charts[0]!;
}

export function isUuidChartId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}
