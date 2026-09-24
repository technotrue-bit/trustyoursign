import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAPRICORN_PLATE_LESSON_UV,
  CAPRICORN_INSIDE_CORE_SCALE,
  applyCapricornPlatePoints,
  capricornHubPlateUv,
  capricornInsideHidesLineCage,
  capricornInsideKeepsPlate,
  capricornSkipsEnterDissolve,
  galaxyPointFromPlateUv,
  CAPRICORN_FALLBACK_MATCH,
} from "./capricornPlateMap";
import { clearSignGalaxyCache, getSignGalaxy, insideHardGateHidesLeftovers } from "./signGalaxy";
import { plateHubUv } from "./signBurst";
import { PLATE_WIDE } from "./temple";

describe("capricorn inside plate", () => {
  it("flags Capricorn-only inside behaviour", () => {
    assert.equal(capricornInsideKeepsPlate("capricorn", "inside"), true);
    assert.equal(capricornInsideKeepsPlate("capricorn", "diving"), false);
    assert.equal(capricornInsideKeepsPlate("aries", "inside"), false);
    assert.equal(capricornInsideKeepsPlate("leo", "inside"), false);
    assert.equal(capricornSkipsEnterDissolve("capricorn"), true);
    assert.equal(capricornSkipsEnterDissolve("aries"), false);
    assert.equal(capricornInsideHidesLineCage("capricorn", "inside"), true);
    assert.equal(capricornInsideHidesLineCage("aries", "inside"), false);
    assert.ok(CAPRICORN_INSIDE_CORE_SCALE < 0.75);
  });

  it("still hides corridor leftovers for other signs when inside", () => {
    assert.equal(insideHardGateHidesLeftovers("inside"), true);
    assert.equal(capricornInsideKeepsPlate("aries", "inside"), false);
  });

  it("maps ten lesson points onto locked plate UVs with hub on the swirl", () => {
    clearSignGalaxyCache();
    const g = getSignGalaxy("capricorn");
    assert.equal(g.points.length, CAPRICORN_PLATE_LESSON_UV.length);
    const hubUv = capricornHubPlateUv(g);
    assert.ok(Math.hypot(hubUv.u - CAPRICORN_PLATE_LESSON_UV[0]!.u, hubUv.v - CAPRICORN_PLATE_LESSON_UV[0]!.v) < 0.02);
    for (let i = 0; i < g.points.length; i++) {
      const expected = CAPRICORN_PLATE_LESSON_UV[i]!;
      const mapped = galaxyPointFromPlateUv(expected, CAPRICORN_FALLBACK_MATCH);
      const p = g.points[i]!;
      assert.ok(
        Math.hypot(p.x - mapped.x, p.y - mapped.y) < 1e-6,
        `point ${i} xy drifted from plate map`,
      );
      const back = plateHubUv(CAPRICORN_FALLBACK_MATCH, p, PLATE_WIDE, 900 / 505);
      assert.ok(
        Math.hypot(back.u - expected.u, back.v - expected.v) < 0.015,
        `point ${i} UV ${back.u.toFixed(4)},${back.v.toFixed(4)} vs ${expected.u},${expected.v}`,
      );
    }
  });

  it("applyCapricornPlatePoints is a no-op for other signs", () => {
    clearSignGalaxyCache();
    const aries = getSignGalaxy("aries");
    const again = applyCapricornPlatePoints(aries);
    assert.equal(again, aries);
  });
});
