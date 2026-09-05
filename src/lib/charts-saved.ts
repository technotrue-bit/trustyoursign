import type { SavedChart } from "./charts";

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

export function hasTimedNatal(chart: SavedChart): boolean {
  return Boolean(
    chart.natal &&
      chart.birthHour != null &&
      chart.birthMinute != null &&
      chart.birthPlace,
  );
}

export function isUuidChartId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}
