import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SavedChart } from "@/lib/charts";
import type { ChartSession } from "@/lib/chart/session/types";
import type { Nativity } from "@/lib/chart/schema";
import {
  canExploreSignStars,
  chartIsExplorableProfile,
  exploreLockReason,
  hasFullChartForSign,
  sessionHasFullChart,
} from "./exploreAccess";

const nat = { id: "visitor", meta: { name: "Test" } } as Nativity;

function visitor(over: Partial<ChartSession> = {}): ChartSession {
  return {
    id: "s1",
    kind: "visitor",
    chartKey: "visitor",
    label: "You",
    relation: "self",
    personName: null,
    signId: "taurus",
    tone: "warm",
    birth: {
      year: 1990,
      month: 5,
      day: 1,
      hour: 14,
      minute: 30,
      place: "Austin, TX",
    },
    nativity: nat,
    skyNatal: null,
    origin: "galaxy",
    mode: "sky",
    selection: null,
    hovered: null,
    tourBeat: null,
    sheetFolded: false,
    ...over,
  };
}

describe("exploreAccess", () => {
  it("requires timed visitor natal for live chart detection", () => {
    assert.equal(sessionHasFullChart(null), false);
    assert.equal(
      sessionHasFullChart(
        visitor({
          birth: {
            year: 1990,
            month: 5,
            day: 1,
            hour: null,
            minute: null,
            place: null,
          },
        }),
      ),
      false,
    );
    assert.equal(sessionHasFullChart(visitor(), "taurus"), true);
    assert.equal(sessionHasFullChart(visitor(), "aries"), false);
  });

  it("opens sign-galaxy lore for guests and signed-in viewers alike", () => {
    const chart = {
      id: "c1",
      relation: "self",
      signId: "leo",
      natal: { ok: true },
      birthHour: 8,
      birthMinute: 15,
      birthPlace: "NYC",
    } as unknown as SavedChart;
    assert.equal(chartIsExplorableProfile(chart), true);
    assert.equal(
      canExploreSignStars({ signId: "leo", session: null, savedCharts: [], signedIn: false }),
      true,
    );
    assert.equal(exploreLockReason({ signId: "leo", session: null, savedCharts: [], signedIn: false }), null);
    assert.equal(
      canExploreSignStars({ signId: "aries", session: null, savedCharts: [chart], signedIn: true }),
      true,
    );
    assert.equal(
      canExploreSignStars({ signId: "taurus", session: visitor(), savedCharts: [], signedIn: false }),
      true,
    );
  });

  it("still detects whether a full chart exists (for Begin birth chart CTA)", () => {
    assert.equal(
      hasFullChartForSign({ signId: "taurus", session: null, savedCharts: [] }),
      false,
    );
    assert.equal(
      hasFullChartForSign({ signId: "taurus", session: visitor(), savedCharts: [] }),
      true,
    );
    const chart = {
      id: "c1",
      relation: "self",
      signId: "leo",
      natal: { ok: true },
      birthHour: 8,
      birthMinute: 15,
      birthPlace: "NYC",
    } as unknown as SavedChart;
    assert.equal(
      hasFullChartForSign({ signId: "leo", session: null, savedCharts: [chart] }),
      true,
    );
  });
});
