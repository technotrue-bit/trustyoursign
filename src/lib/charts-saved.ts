import type { SavedChart } from "./charts";

/** LocalStorage / guest Ask key used before a charts row exists. */
export const GUEST_ASK_KEY = "visitor";

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
