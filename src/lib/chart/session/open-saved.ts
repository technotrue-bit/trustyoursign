import { computeVisitorNatal } from "@/lib/chart/sky";
import type { SavedChart } from "@/lib/charts";
import { hasTimedNatal } from "@/lib/charts-saved";
import type { SkyBody, SkyNatal } from "@/lib/chart/ephemeris";
import type { Surface } from "./types";
import { fromSavedChart } from "./factories";
import { seekSignFor, useSessionStore } from "./store";
import { openSessionState } from "./actions";

/** Keep saved prose (depth / writtenAt / headlines) while refreshing cast positions. */
function mergeSavedSky(fresh: SkyNatal, saved: SkyNatal): SkyNatal {
  const byId = new Map(saved.bodies.map((b) => [b.id, b]));
  const bodies: SkyBody[] = fresh.bodies.map((b) => {
    const prev = byId.get(b.id);
    if (!prev) return b;
    return {
      ...b,
      headline: prev.headline || b.headline,
      why: prev.why || b.why,
      body: prev.body?.length ? prev.body : b.body,
    };
  });
  return {
    ...fresh,
    depth: saved.depth ?? fresh.depth,
    writtenAt: saved.writtenAt ?? fresh.writtenAt,
    tone: saved.tone ?? fresh.tone,
    bodies,
  };
}

export async function openSavedChart(
  chart: SavedChart,
  origin: Surface,
): Promise<void> {
  let nativity = null as Awaited<ReturnType<typeof computeVisitorNatal>>["nativity"] | null;
  let sky = null as Awaited<ReturnType<typeof computeVisitorNatal>>["sky"] | null;

  if (hasTimedNatal(chart)) {
    try {
      const natal = chart.natal;
      const hasCoords =
        natal &&
        typeof natal.lat === "number" &&
        Number.isFinite(natal.lat) &&
        typeof natal.lon === "number" &&
        Number.isFinite(natal.lon) &&
        typeof natal.timeZone === "string" &&
        natal.timeZone.trim().length > 0;

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
          ...(hasCoords
            ? { lat: natal!.lat, lon: natal!.lon, timeZone: natal!.timeZone }
            : {}),
        },
      });
      nativity = out.nativity;
      sky = natal ? mergeSavedSky(out.sky, natal) : out.sky;
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
  if (session.kind === "shelf") {
    seekSignFor(session.signId);
  }
  useSessionStore.setState((state) => openSessionState(state, session));
}
