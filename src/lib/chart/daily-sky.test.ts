import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DAILY_COPY,
  composeDailySky,
  dailySky,
  moonRelation,
  phaseMode,
  type DailySkyInput,
} from "./daily-sky.ts";
import { SIGN_IDS } from "./sign-canon.ts";

function input(over: Partial<DailySkyInput> = {}): DailySkyInput {
  return {
    signId: "scorpio",
    dateKey: "2026-10-26",
    phaseName: "Full Moon",
    phaseAngle: 180,
    illumination: 0.99,
    moonSignId: "taurus",
    sunSignId: "scorpio",
    nextMoon: null,
    ...over,
  };
}

describe("moonRelation", () => {
  it("reads the Moon's sign against yours by distance around the wheel", () => {
    assert.equal(moonRelation("leo", "leo"), "home");
    assert.equal(moonRelation("leo", "libra"), "sextile");
    assert.equal(moonRelation("leo", "gemini"), "sextile");
    assert.equal(moonRelation("leo", "scorpio"), "square");
    assert.equal(moonRelation("leo", "sagittarius"), "trine");
    assert.equal(moonRelation("leo", "aries"), "trine");
    assert.equal(moonRelation("leo", "aquarius"), "opposite");
    assert.equal(moonRelation("leo", "virgo"), "quiet");
    assert.equal(moonRelation("leo", "capricorn"), "quiet");
    // Pisces to Aries wraps: one step, not eleven.
    assert.equal(moonRelation("pisces", "aries"), "quiet");
    assert.equal(moonRelation("pisces", "taurus"), "sextile");
  });
});

describe("phaseMode", () => {
  it("groups the eight phases into four moods", () => {
    assert.equal(phaseMode("New Moon"), "begin");
    assert.equal(phaseMode("Waxing Crescent"), "build");
    assert.equal(phaseMode("First Quarter"), "build");
    assert.equal(phaseMode("Waxing Gibbous"), "build");
    assert.equal(phaseMode("Full Moon"), "reveal");
    assert.equal(phaseMode("Waning Gibbous"), "release");
    assert.equal(phaseMode("Last Quarter"), "release");
    assert.equal(phaseMode("Waning Crescent"), "release");
  });
});

describe("composeDailySky", () => {
  it("names the sign, the Moon's sign and the relation in plain words", () => {
    const day = composeDailySky(input());
    assert.equal(day.signName, "Scorpio");
    assert.equal(day.moonSignName, "Taurus");
    assert.equal(day.sunSignName, "Scorpio");
    assert.equal(day.relation, "opposite");
    assert.ok(day.headline.length > 0);
    assert.ok(day.body.includes("Taurus"), day.body);
    assert.ok(day.leanInto.length > 0 && day.goEasy.length > 0);
    assert.ok(day.phaseLine.length > 0);
  });

  it("is the same all day for the same sign, so a refresh doesn't change the reading", () => {
    assert.deepEqual(composeDailySky(input()), composeDailySky(input()));
  });

  it("changes the words on the next day even when the Moon has not left the sign", () => {
    const today = composeDailySky(input({ dateKey: "2026-10-26" }));
    const tomorrow = composeDailySky(input({ dateKey: "2026-10-27" }));
    assert.equal(today.relation, tomorrow.relation);
    assert.notEqual(today.headline, tomorrow.headline);
  });

  it("leaves no template holes in any line for any sign", () => {
    for (const signId of SIGN_IDS) {
      for (const moonSignId of SIGN_IDS) {
        for (const d of ["2026-10-26", "2026-10-27", "2026-10-28"]) {
          const day = composeDailySky(input({ signId, moonSignId, dateKey: d }));
          for (const line of [day.headline, day.body, day.leanInto, day.goEasy, day.phaseLine]) {
            assert.ok(!/[{}]/.test(line), `${signId}/${moonSignId}: ${line}`);
          }
        }
      }
    }
  });

  it("has at least three variants per relation so consecutive days differ", () => {
    for (const rel of Object.keys(DAILY_COPY) as (keyof typeof DAILY_COPY)[]) {
      assert.ok(DAILY_COPY[rel].length >= 3, rel);
    }
  });
});

describe("dailySky", () => {
  it("reads the real sky and finds when the Moon next changes sign", async () => {
    // 2024-08-19 18:00 UTC: Moon in Aquarius, near full, Sun in Leo.
    const when = new Date("2024-08-19T18:00:00Z");
    const day = await dailySky("leo", when);
    assert.equal(day.moonSignId, "aquarius");
    assert.equal(day.sunSignId, "leo");
    assert.equal(day.relation, "opposite");
    assert.ok(day.nextMoon, "expected a next sign");
    assert.equal(day.nextMoon!.signId, "pisces");
    const hours = (day.nextMoon!.at.getTime() - when.getTime()) / 3_600_000;
    assert.ok(hours > 0 && hours < 64, `ingress in ${hours}h`);
  });
});
