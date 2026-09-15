import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeNatalCast, localToUtc, type GeoPlace } from "./ephemeris.ts";
import { buildVisitorNativity, skyNatalFromCast } from "./visitor-nativity.ts";
import { answerFromBones } from "./bones-ask.ts";

const PLACE: GeoPlace = {
  name: "Port Huron, Michigan, United States",
  lat: 42.97,
  lon: -82.42,
  timeZone: "America/Detroit",
};

describe("visitor natal cast", () => {
  it("casts planets, angles, and builds a room-ready Nativity", () => {
    const utc = localToUtc(2004, 7, 26, 18, 21, PLACE.timeZone);
    const cast = computeNatalCast(utc, PLACE);
    assert.ok(cast.points.length >= 12);
    assert.ok(cast.angles.asc >= 0 && cast.angles.asc < 360);
    assert.ok(cast.angles.mc >= 0 && cast.angles.mc < 360);

    const sun = cast.points.find((p) => p.id === "sun");
    assert.ok(sun);
    assert.equal(sun!.signId, "leo");

    const nat = buildVisitorNativity(cast, {
      label: "Test natal",
      when: "26 Jul 2004 · 6:21 pm",
      dateLabel: "26 Jul 2004",
      timeLabel: "6:21 pm",
    });
    assert.equal(nat.id, "visitor");
    assert.equal(nat.meta.zodiac, "Tropical");
    assert.equal(nat.meta.houses, "Whole Sign");
    assert.equal(nat.meta.engine, "astronomy-engine");
    assert.ok(nat.planets.some((p) => p.id === "venus"));
    assert.equal(nat.planetById.node, undefined);
    assert.equal(nat.planetById.chiron, undefined);
    assert.equal(nat.planetById.lilith, undefined);
    assert.ok(nat.planetById.sun);
    assert.equal(nat.houses.length, 12);
    assert.equal(nat.chakras.length, 7);
    assert.equal(nat.gates.length, 3);
    assert.ok(nat.readings.some((r) => r.id === "body"));
    assert.ok(nat.readings.some((r) => r.id === "clothes"));
    assert.match(nat.planetById.sun!.why, /will|Leo|Sun/i);
    assert.match(nat.meta.oneCut, /Sun in Leo/);

    const sky = skyNatalFromCast(cast, "26 Jul 2004 · 6:21 pm");
    assert.equal(sky.bodies.length, 3);
    assert.ok(sky.bodies.every((b) => b.headline.length > 0));

    const ask = answerFromBones(nat, "What is my sun holding?");
    assert.match(ask, /Sun/i);
    assert.doesNotMatch(ask, /Saige/);
  });
});
