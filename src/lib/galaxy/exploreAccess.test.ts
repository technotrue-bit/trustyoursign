import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SavedChart } from "@/lib/charts";
import type { ChartSession } from "@/lib/chart/session/types";
import type { Nativity } from "@/lib/chart/schema";
import {
  canExploreSignStars,
  chartIsExplorableProfile,
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
  it("requires timed visitor natal for live unlock", () => {
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

  it("treats self timed saved charts as profiles", () => {
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
    assert.equal(canExploreSignStars({ signId: "leo", session: null, savedCharts: [chart] }), true);
    assert.equal(canExploreSignStars({ signId: "aries", session: null, savedCharts: [chart] }), false);
  });

  it("unlocks from live full visitor session", () => {
    assert.equal(canExploreSignStars({ signId: "taurus", session: visitor(), savedCharts: [] }), true);
  });
});
