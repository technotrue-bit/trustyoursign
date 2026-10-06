import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SkyBody, SkyNatal } from "@/lib/chart/ephemeris";
import { mergeSavedSky } from "./open-saved.ts";

function body(partial: Partial<SkyBody> & Pick<SkyBody, "id">): SkyBody {
  return {
    name: partial.id,
    lon: 0,
    signId: "aries",
    signName: "Aries",
    degInSign: 0,
    house: 1,
    note: "",
    headline: "",
    why: "",
    body: [],
    ...partial,
  };
}

function sky(bodies: SkyBody[]): SkyNatal {
  return {
    depth: "three",
    tone: "warm",
    when: "1 Jan 2000",
    place: "Here",
    lat: 0,
    lon: 0,
    timeZone: "UTC",
    bodies,
    writtenAt: null,
  };
}

const saved = sky([
  body({
    id: "sun",
    headline: "The saved sun line",
    why: "saved why",
    body: ["First saved paragraph.", "Second saved paragraph."],
    lon: 10,
    signId: "aries",
    signName: "Aries",
    degInSign: 10,
    house: 1,
  }),
  body({
    id: "moon",
    headline: "The saved moon line",
    why: "saved moon why",
    body: ["Moon paragraph."],
    lon: 100,
    signId: "cancer",
    signName: "Cancer",
    degInSign: 10,
    house: 4,
  }),
]);

const fresh = sky([
  body({
    id: "moon",
    headline: "",
    why: "",
    body: [],
    lon: 200,
    signId: "libra",
    signName: "Libra",
    degInSign: 20,
    house: 8,
  }),
  body({
    id: "sun",
    headline: "",
    why: "",
    body: [],
    lon: 45,
    signId: "taurus",
    signName: "Taurus",
    degInSign: 15,
    house: 5,
  }),
]);

describe("mergeSavedSky", () => {
  it("keeps saved headline and body when the fresh cast prose is empty", () => {
    const merged = mergeSavedSky(fresh, saved);
    const sun = merged.bodies.find((b) => b.id === "sun");
    const moon = merged.bodies.find((b) => b.id === "moon");
    assert.ok(sun);
    assert.ok(moon);
    assert.equal(sun.headline, "The saved sun line");
    assert.deepEqual(sun.body, ["First saved paragraph.", "Second saved paragraph."]);
    assert.equal(moon.headline, "The saved moon line");
    assert.deepEqual(moon.body, ["Moon paragraph."]);
  });

  it("replaces old positions with the fresh cast", () => {
    const merged = mergeSavedSky(fresh, saved);
    const sun = merged.bodies.find((b) => b.id === "sun");
    const moon = merged.bodies.find((b) => b.id === "moon");
    assert.ok(sun);
    assert.ok(moon);
    assert.equal(sun.lon, 45);
    assert.equal(sun.signId, "taurus");
    assert.equal(sun.signName, "Taurus");
    assert.equal(sun.degInSign, 15);
    assert.equal(sun.house, 5);
    assert.equal(moon.lon, 200);
    assert.equal(moon.signId, "libra");
    assert.equal(moon.signName, "Libra");
    assert.equal(moon.degInSign, 20);
    assert.equal(moon.house, 8);
  });
});
