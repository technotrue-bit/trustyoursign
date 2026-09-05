import { computeVisitorNatal } from "@/lib/chart/sky";
import type { SavedChart } from "@/lib/charts";
import { hasTimedNatal } from "@/lib/charts-saved";
import type { Surface } from "./types";
import { fromSavedChart } from "./factories";
import { useSessionStore } from "./store";
import { openSessionState } from "./actions";

export async function openSavedChart(
  chart: SavedChart,
  origin: Surface,
): Promise<void> {
  let nativity = null as Awaited<ReturnType<typeof computeVisitorNatal>>["nativity"] | null;
  let sky = null as Awaited<ReturnType<typeof computeVisitorNatal>>["sky"] | null;

  if (hasTimedNatal(chart)) {
    try {
      const out = await computeVisitorNatal({
        data: {
          year: chart.birthYear,
          month: chart.birthMonth,
          day: chart.birthDay,
          hour: chart.birthHour!,
          minute: chart.birthMinute!,
          place: chart.birthPlace!,
          tone: chart.tone,
          label: chart.label,
        },
      });
      nativity = out.nativity;
      sky = out.sky;
    } catch {
      /* fall through to shelf */
    }
  }

  const session = fromSavedChart({
    chart,
    origin,
    nativity,
    skyNatal: sky,
  });
  useSessionStore.setState((state) => openSessionState(state, session));
}
