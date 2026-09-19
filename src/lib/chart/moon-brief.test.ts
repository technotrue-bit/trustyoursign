import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deterministicMoonEffect } from "./moon-brief.ts";
import type { MoonDayBrief } from "./moon-day.ts";

const sample: MoonDayBrief = {
  dateKey: "2026-09-19",
  phaseName: "Waxing Gibbous",
  illumination: 0.58,
  moonSignId: "capricorn",
  moonSignName: "Capricorn",
};

describe("deterministicMoonEffect", () => {
  it("names phase, moon sign, and explored sign", () => {
    const text = deterministicMoonEffect(sample, "virgo");
    assert.match(text, /Waxing Gibbous/);
    assert.match(text, /Capricorn/);
    assert.match(text, /Virgo/);
    assert.match(text, /58%/);
  });

  it("stays short", () => {
    const text = deterministicMoonEffect(sample, "aries");
    assert.ok(text.length > 80 && text.length <= 900);
  });
});
