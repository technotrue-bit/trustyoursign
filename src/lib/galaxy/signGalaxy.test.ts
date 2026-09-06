import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONSTELLATIONS } from "./constellations";
import {
  buildSignGalaxy,
  enterGalaxyForm,
  enterPlateFade,
  enterWorldFade,
  getSignGalaxy,
  pickMajorStarIndices,
} from "./signGalaxy";

describe("signGalaxy", () => {
  it("builds a galaxy for every sign from animal stars", () => {
    for (const c of CONSTELLATIONS) {
      const g = buildSignGalaxy(c.id);
      assert.equal(g.stars.length, c.animal.stars.length);
      assert.equal(g.lines.length, c.animal.lines.length);
      assert.ok(g.points.length >= 3);
      assert.ok(g.points.length <= 10);
      assert.ok(g.points.some((p) => p.isHub));
      assert.ok(g.points.every((p) => p.purpose.title.length > 0 && p.purpose.body.length > 0));
    }
  });

  it("places travel points on animal star indices", () => {
    const g = getSignGalaxy("aries");
    for (const p of g.points) {
      assert.ok(p.starIndex >= 0);
      assert.ok(p.starIndex < g.stars.length);
      assert.equal(p.x, g.stars[p.starIndex]!.x);
      assert.equal(p.y, g.stars[p.starIndex]!.y);
    }
  });

  it("picks a spread of major stars", () => {
    const animal = CONSTELLATIONS.find((c) => c.id === "sagittarius")!.animal;
    const majors = pickMajorStarIndices(animal, 8);
    assert.ok(majors.length >= 4);
    assert.equal(new Set(majors).size, majors.length);
  });

  it("enter fades plate before galaxy fully forms", () => {
    assert.ok(Math.abs(enterWorldFade(0) - 1) < 0.02);
    assert.ok(enterWorldFade(0.25) < 0.2);
    assert.ok(Math.abs(enterPlateFade(0) - 1) < 0.02);
    assert.ok(enterPlateFade(0.45) < 0.15);
    assert.ok(enterGalaxyForm(0.1) < 0.05);
    assert.ok(Math.abs(enterGalaxyForm(1) - 1) < 0.02);
    // Plate is gone while galaxy is still forming.
    assert.ok(enterPlateFade(0.4) < enterGalaxyForm(0.4) + 0.35);
  });
});
