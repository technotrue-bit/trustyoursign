import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONSTELLATIONS } from "./constellations";
import {
  NODE_DEPTH_NEAR,
  buildSignGalaxy,
  clearSignGalaxyCache,
  enterCoreReveal,
  enterDive,
  enterGalaxyForm,
  enterHubSettle,
  enterPlateFade,
  enterRush,
  enterWorldFade,
  getSignGalaxy,
  insideHardGateHidesLeftovers,
  pickMajorStarIndices,
} from "./signGalaxy";

describe("signGalaxy", () => {
  it("builds a galaxy for every sign from animal stars", () => {
    clearSignGalaxyCache();
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

  it("anchors travel points to animal majors but places them inside the galaxy volume", () => {
    clearSignGalaxyCache();
    const g = getSignGalaxy("aries");
    const hub = g.points.find((p) => p.isHub)!;
    assert.ok(hub);
    assert.ok(Math.abs(hub.z - NODE_DEPTH_NEAR) < 1e-6);
    // Hub sits nearer the portal/center than its silhouette star.
    const sil = g.stars[hub.starIndex]!;
    assert.ok(Math.hypot(hub.x, hub.y) <= Math.hypot(sil.x, sil.y) + 1e-6);
    for (const p of g.points) {
      assert.ok(p.starIndex >= 0);
      assert.ok(p.starIndex < g.stars.length);
      // Interior nodes are deeper than the shallow silhouette star they reference.
      assert.ok(
        p.z > g.stars[p.starIndex]!.z + 0.5,
        `point ${p.id} z=${p.z} should be deeper than silhouette ${g.stars[p.starIndex]!.z}`,
      );
    }
    const nonHub = g.points.filter((p) => !p.isHub);
    assert.ok(nonHub.every((p) => p.z > hub.z));
  });

  it("picks a spread of major stars", () => {
    const animal = CONSTELLATIONS.find((c) => c.id === "sagittarius")!.animal;
    const majors = pickMajorStarIndices(animal, 8);
    assert.ok(majors.length >= 4);
    assert.equal(new Set(majors).size, majors.length);
  });

  it("enter windows: figure holds, then the rush carries you into the core", () => {
    // `fade` channels run 1 → 0; the rest ramp 0 → 1. Both must be monotonic
    // and stay in range — no channel may overshoot or walk backwards.
    const channels: [string, (p: number) => number, "up" | "down"][] = [
      ["worldFade", enterWorldFade, "down"],
      ["plateFade", enterPlateFade, "down"],
      ["form", enterGalaxyForm, "up"],
      ["dive", enterDive, "up"],
      ["rush", enterRush, "up"],
      ["core", enterCoreReveal, "up"],
      ["settle", enterHubSettle, "up"],
    ];
    for (const [name, fn, dir] of channels) {
      let prev = fn(0);
      for (let p = 0.01; p <= 1.0001; p += 0.01) {
        const v = fn(p);
        assert.ok(v >= 0 && v <= 1, `${name} out of range at ${p.toFixed(2)}: ${v}`);
        if (dir === "up") {
          assert.ok(v >= prev - 1e-9, `${name} went backwards at ${p.toFixed(2)}`);
        } else {
          assert.ok(v <= prev + 1e-9, `${name} crept back up at ${p.toFixed(2)}`);
        }
        prev = v;
      }
    }

    assert.ok(Math.abs(enterWorldFade(0) - 1) < 0.02);
    assert.ok(enterWorldFade(0.2) < 0.05);

    // Beat 1: the painted figure owns the frame, no early live-figure pop.
    assert.ok(Math.abs(enterPlateFade(0) - 1) < 0.02);
    assert.ok(enterPlateFade(0.06) > 0.98);
    assert.ok(enterGalaxyForm(0.06) < 0.02);
    assert.ok(enterDive(0.03) < 0.02);

    // Beat 2: the plate is gone before the rush is close (no painted wall), and
    // the live figure already owns the middle of the shot.
    assert.ok(enterPlateFade(0.42) < 0.05);
    assert.ok(enterGalaxyForm(0.42) > 0.75);
    assert.ok(enterRush(0.3) < 0.02);
    assert.ok(enterRush(0.65) > 0.2 && enterRush(0.65) < 0.8);

    // Beat 3: dive and rush complete, core is the hero, look settles on the hub.
    assert.ok(enterDive(0.86) > 0.98);
    assert.ok(Math.abs(enterRush(1) - 1) < 0.02);
    assert.ok(enterCoreReveal(0.34) < 0.02);
    assert.ok(enterCoreReveal(0.8) > 0.7);
    assert.ok(Math.abs(enterCoreReveal(1) - 1) < 0.02);
    assert.ok(enterHubSettle(0.6) < 0.02);
    assert.ok(Math.abs(enterHubSettle(1) - 1) < 0.02);
  });
});

describe("insideHardGateHidesLeftovers", () => {
  it("hides leftovers only when inside", () => {
    assert.equal(insideHardGateHidesLeftovers("idle"), false);
    assert.equal(insideHardGateHidesLeftovers("fading"), false);
    assert.equal(insideHardGateHidesLeftovers("diving"), false);
    assert.equal(insideHardGateHidesLeftovers("inside"), true);
    assert.equal(insideHardGateHidesLeftovers("exiting"), false);
  });
});
