import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  localDateKey,
  moonDayBrief,
  phaseNameFromAngle,
} from "./moon-day.ts";

describe("phaseNameFromAngle", () => {
  it("names the eight classical phases from elongation", () => {
    assert.equal(phaseNameFromAngle(0), "New Moon");
    assert.equal(phaseNameFromAngle(45), "Waxing Crescent");
    assert.equal(phaseNameFromAngle(90), "First Quarter");
    assert.equal(phaseNameFromAngle(135), "Waxing Gibbous");
    assert.equal(phaseNameFromAngle(180), "Full Moon");
    assert.equal(phaseNameFromAngle(225), "Waning Gibbous");
    assert.equal(phaseNameFromAngle(270), "Last Quarter");
    assert.equal(phaseNameFromAngle(315), "Waning Crescent");
    assert.equal(phaseNameFromAngle(350), "New Moon");
  });
});

describe("moonDayBrief", () => {
  it("returns tropical moon sign and phase for a fixed UTC instant", () => {
    // 2024-08-19 near full moon
    const when = new Date("2024-08-19T18:00:00Z");
    const brief = moonDayBrief(when);
    assert.equal(brief.dateKey, localDateKey(when));
    assert.ok(brief.illumination > 0.9, `expected near-full, got ${brief.illumination}`);
    assert.equal(brief.phaseName, "Full Moon");
    assert.ok(brief.moonSignName.length > 2);
    assert.ok(
      [
        "aries",
        "taurus",
        "gemini",
        "cancer",
        "leo",
        "virgo",
        "libra",
        "scorpio",
        "sagittarius",
        "capricorn",
        "aquarius",
        "pisces",
      ].includes(brief.moonSignId),
    );
  });

  it("keeps illumination in 0..1", () => {
    const brief = moonDayBrief(new Date("2026-09-19T16:00:00Z"));
    assert.ok(brief.illumination >= 0 && brief.illumination <= 1);
  });
});
