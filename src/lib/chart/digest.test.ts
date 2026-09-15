import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlanetDef } from "./planets.ts";
import {
  canonForPlanet,
  digestGates,
  digestPlanet,
  digestReadings,
  streetForPlanet,
} from "./digest.ts";

function stub(partial: Partial<PlanetDef> & Pick<PlanetDef, "id" | "name" | "lon" | "house">): PlanetDef {
  return {
    glyph: partial.name.slice(0, 4),
    wholeSign: partial.wholeSign ?? partial.house,
    retrograde: false,
    dignity: "peregrine",
    color: "#fff",
    glow: "#fff",
    size: 0.1,
    radius: 1,
    headline: "",
    why: "",
    body: [],
    note: "",
    ...partial,
  };
}

describe("digest engine", () => {
  const sun = stub({
    id: "sun",
    name: "Sun",
    lon: 124.239,
    house: 8,
    wholeSign: 9,
    dignity: "domicile",
  });
  const moon = stub({
    id: "moon",
    name: "Moon",
    lon: 237.35,
    house: 11,
    wholeSign: 12,
    dignity: "fall",
  });
  const asc = stub({
    id: "asc",
    name: "Rising",
    lon: 264.57,
    house: 1,
    dignity: "angle",
  });
  const venus = stub({
    id: "venus",
    name: "Venus",
    lon: 80.8,
    house: 6,
    wholeSign: 7,
  });
  const mars = stub({
    id: "mars",
    name: "Mars",
    lon: 140.83,
    house: 8,
  });
  const mc = stub({
    id: "mc",
    name: "Midheaven",
    lon: 199.25,
    house: 10,
    dignity: "angle",
  });
  const mercury = stub({
    id: "mercury",
    name: "Mercury",
    lon: 151.34,
    house: 8,
    dignity: "exaltation",
  });

  it("street names the job, the sign, and the house without requiring jargon", () => {
    const street = streetForPlanet(sun, "she");
    assert.match(street, /will/i);
    assert.match(street, /Leo/);
    assert.match(street, /8th/);
    assert.match(street, /Whole Sign 9th/);
    assert.match(street, /domicile/);
    assert.doesNotMatch(street, /\byou\b/);
  });

  it("you-voice does not leak into she-voice", () => {
    const she = streetForPlanet(asc, "she");
    const you = streetForPlanet(asc, "you");
    assert.match(she, /She|her|hers/i);
    assert.match(you, /You|your/i);
    assert.doesNotMatch(she, /\bYou\b/);
  });

  it("canon is degree-first", () => {
    const canon = canonForPlanet(sun);
    assert.match(canon, /Leo/);
    assert.match(canon, /house 8/);
    assert.match(canon, /domicile/);
  });

  it("digestPlanet returns three registers", () => {
    const d = digestPlanet(sun, "you");
    assert.ok(d.street.length > 40);
    assert.ok(d.lived.length > 20);
    assert.ok(d.canon.includes("Leo"));
    assert.notEqual(d.street, d.canon);
  });

  it("gates and body/clothes readings are generated from the table", () => {
    const planets = [sun, moon, asc, venus, mars, mc, mercury];
    const gates = digestGates(planets, "you");
    assert.equal(gates.length, 3);
    assert.ok(gates.every((g) => g.street && g.street.length > 20));
    const readings = digestReadings(planets, "you");
    const ids = readings.map((r) => r.id);
    assert.ok(ids.includes("body"));
    assert.ok(ids.includes("clothes"));
    assert.ok(ids.includes("love"));
    const body = readings.find((r) => r.id === "body")!;
    assert.match(body.street ?? "", /attention map|Rising|hips|body/i);
    assert.doesNotMatch(body.body.join(" "), /Saige/);
  });
});
