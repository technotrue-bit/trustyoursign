import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SavedChart } from "./charts.ts";
import { asChartKey, GUEST_ASK_KEY, hasTimedNatal, isUuidChartId } from "./charts-saved.ts";

const base: SavedChart = {
  id: "11111111-1111-1111-1111-111111111111",
  label: "Mine",
  relation: "self",
  personName: null,
  signId: "leo",
  birthMonth: 8,
  birthDay: 1,
  birthYear: 1990,
  birthHour: null,
  birthMinute: null,
  birthPlace: null,
  natal: null,
  tone: "vault",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("charts-saved helpers", () => {
  it("hasTimedNatal requires natal + hour + minute + place", () => {
    assert.equal(hasTimedNatal(base), false);
    assert.equal(
      hasTimedNatal({
        ...base,
        birthHour: 12,
        birthMinute: 0,
        birthPlace: "Detroit",
        natal: { tone: "vault" } as SavedChart["natal"],
      }),
      true,
    );
  });

  it("isUuidChartId accepts chart uuids only", () => {
    assert.equal(isUuidChartId(base.id), true);
    assert.equal(isUuidChartId("visitor"), false);
    assert.equal(isUuidChartId("joey"), false);
  });

  it("GUEST_ASK_KEY is the legacy local visitor key", () => {
    assert.equal(GUEST_ASK_KEY, "visitor");
  });

  it("asChartKey rejects bare visitor for server ask", () => {
    assert.throws(() => asChartKey("visitor"), /Unknown chart/);
    assert.throws(() => asChartKey("  VISITOR  "), /Unknown chart/);
  });
});
