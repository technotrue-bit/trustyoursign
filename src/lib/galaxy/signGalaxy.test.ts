import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONSTELLATIONS } from "./constellations";
import {
  NODE_DEPTH_NEAR,
  PLATE_GONE_BY,
  PLATE_HOLD_TO,
  buildSignGalaxy,
  clearSignGalaxyCache,
  enterBurst,
  enterBurstDissolve,
  enterBurstIgnition,
  enterBurstImpulse,
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
import { DISSOLVE_END } from "./signBurst";

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

    // Beat 2: the live figure owns the middle of the shot, and the erode mask —
    // not this clock — is what finishes the painting (M11 test below): the plate
    // is still whole at the point the old curve had already killed it, and the
    // live figure follows it in. No painted wall: from DISSOLVE_END on, every
    // plate pixel is masked, and the fade is done well before the rush arrives.
    assert.ok(enterPlateFade(0.42) > 0.99);
        assert.ok(enterPlateFade(PLATE_HOLD_TO) > 0.99);
        assert.ok(enterPlateFade(0.68) < 0.2);
        assert.ok(enterPlateFade(PLATE_GONE_BY) < 0.05);
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

describe("ignition hand-off channels", () => {
  it("carries one pulse on the enter clock, centred where the crossfade was", () => {
    // The measured dark hole sits at p≈0.27–0.37; the pulse must own that window.
    assert.ok(enterBurst(0.27) > 0.8);
    assert.ok(enterBurst(0.37) > 0.99);
    assert.equal(enterBurst(0), 0);
    assert.equal(enterBurst(1), 0);
    let peak = 0;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const v = enterBurst(p);
      assert.ok(v >= 0 && v <= 1 + 1e-9);
      peak = Math.max(peak, v);
    }
    assert.ok(Math.abs(peak - 1) < 1e-9);
  });

  it("lights the figure before the blast consumes it", () => {
    assert.ok(enterBurstIgnition(0.2) > 0.5, "figure must be lit at t≈0.9s");
    assert.ok(enterBurstIgnition(0.2) > enterBurstDissolve(0.2));
    assert.equal(enterBurstDissolve(0.18), 0);
    assert.equal(enterBurstDissolve(DISSOLVE_END), 1);
    // The figure outlives the burst's own peak: the light arrives first, the
    // erode front finishes after it (M11).
    assert.ok(enterBurstDissolve(0.36) < 0.6);
  });

  it("degrades the pulse to a slow brighten under reduced motion (no flash)", () => {
    assert.ok(enterBurst(0.3, true) < enterBurst(0.3, false));
    assert.ok(enterBurst(0.6, true) > 0.9);
    assert.equal(enterBurst(0.05, true), 0);
    assert.ok(enterBurstImpulse(0.35, true) < enterBurstImpulse(0.35, false));
    // Nothing may survive into the landing on the reduced path either.
    assert.ok(enterBurst(1, true) < 1e-9);
    assert.ok(enterBurstIgnition(1, true) < 1e-9);
    assert.ok(enterBurstIgnition(0.5, true) > 0.9);
    assert.ok(enterBurstIgnition(0.3, true) < enterBurstIgnition(0.3, false));
  });

  it("keeps the debris impulse inside the pulse", () => {
    assert.equal(enterBurstImpulse(0), 0);
    assert.equal(enterBurstImpulse(0.96), 0);
    assert.ok(enterBurstImpulse(0.4) > 0.5);
  });

  it("holds the figure on screen until the burst peaks, then lets the dissolve eat it (M11)", () => {
    // The samples the failure was measured at (p 0.19 → 0.36 is where the burst
    // ramp, and the peak as the frames see it, live). The painted figure must
    // still be the subject: >= 0.85 opaque at every one of them.
    for (const p of [0.19, 0.22, 0.26, 0.3, 0.36]) {
      assert.ok(
        enterPlateFade(p) >= 0.85,
        `plate opacity at p=${p} was ${enterPlateFade(p).toFixed(3)} — the figure is gone before the light arrives`,
      );
    }
    // The blast peaks while the plate is still fully opaque…
    assert.ok(enterBurst(0.36) > 0.99);
    assert.ok(enterPlateFade(0.36) > 0.99);
    // …so the death is *caused* by the mask, not by a fade that finished first:
    // the erode front has passed every corner (dissolve = 1) before the plate
    // channel starts to let go, and the channel is untouched up to that point.
    assert.ok(PLATE_HOLD_TO >= DISSOLVE_END, "the fade may not start before the dissolve is complete");
    assert.ok(enterBurstDissolve(PLATE_HOLD_TO) >= 0.999);
    assert.ok(enterPlateFade(PLATE_HOLD_TO) > 0.99);
    // And it does let go: gone before the rush is close, long before the landing.
    assert.ok(enterPlateFade(PLATE_GONE_BY) < 0.001);
    assert.ok(PLATE_GONE_BY < 0.86);
    assert.ok(enterPlateFade(1) < 1e-9);
  });
});
