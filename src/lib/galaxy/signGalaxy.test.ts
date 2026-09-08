import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONSTELLATIONS } from "./constellations";
import {
  buildSignGalaxy,
  enterDive,
  enterGalaxyForm,
  enterHubSettle,
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

  it("enter windows: plate stays while diving into hub star; bloom overlaps", () => {
    assert.ok(Math.abs(enterWorldFade(0) - 1) < 0.02);
    assert.ok(enterWorldFade(0.22) < 0.05);
    assert.ok(Math.abs(enterPlateFade(0) - 1) < 0.02);
    // Mid-dive: plate still readable; bloom and dive already underway toward hub.
    assert.ok(enterPlateFade(0.35) > 0.85);
    assert.ok(enterGalaxyForm(0.35) > 0.05);
    assert.ok(enterDive(0.35) > 0.2);
    assert.ok(enterHubSettle(0.35) > 0.1);
    // Deep dive: plate nearly gone; form and dive complete.
    assert.ok(enterPlateFade(0.78) < 0.05);
    assert.ok(Math.abs(enterGalaxyForm(1) - 1) < 0.02);
    assert.ok(enterDive(0.82) > 0.98);
    assert.ok(Math.abs(enterHubSettle(1) - 1) < 0.02);
  });
});
