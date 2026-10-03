import type { ResearchChartId } from "@/lib/chart/types";

/**
 * The next research-chart open from the address bar should leave the side
 * sheet open. "The sky" clears this so the wheel stays the thing you see.
 * Held only for the desk that was asked for, and only until that open runs.
 */
let pendingDesk: ResearchChartId | null = null;

export function showChartRoomsOnNextBoot(desk: ResearchChartId) {
  pendingDesk = desk;
}

export function clearChartRoomsBoot() {
  pendingDesk = null;
}

/** True once, and only for the desk Chart rooms asked to keep open. */
export function takeChartRoomsBoot(desk: ResearchChartId): boolean {
  if (pendingDesk !== desk) return false;
  pendingDesk = null;
  return true;
}
