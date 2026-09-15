import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CORE_LOCAL_SIZE, coreAccent, coreOpacity, coreSwell, coreSpin, hexLuma } from "./signCore";

describe("signCore", () => {
  it("swells from first light to full size, monotonic and bounded", () => {
    assert.ok(coreSwell(0) > 0.3 && coreSwell(0) < 0.4);
    assert.ok(Math.abs(coreSwell(1) - 1) < 1e-6);
    let prev = coreSwell(0);
    for (let p = 0.02; p <= 1.0001; p += 0.02) {
      const v = coreSwell(p);
      assert.ok(v >= prev - 1e-9, `coreSwell went backwards at ${p.toFixed(2)}`);
      assert.ok(v <= 1 + 1e-9, `coreSwell overshot at ${p.toFixed(2)}`);
      prev = v;
    }
  });

  it("opacity is continuous across the landing (p = 1 equals inside)", () => {
    assert.ok(coreOpacity(0, false) < 0.05);
    assert.ok(Math.abs(coreOpacity(1, false) - coreOpacity(1, true)) < 1e-9);
    assert.ok(Math.abs(coreOpacity(1, true) - 0.94) < 1e-6);
    let prev = coreOpacity(0, false);
    for (let p = 0.02; p <= 1.0001; p += 0.02) {
      const v = coreOpacity(p, false);
      assert.ok(v >= prev - 1e-9, `coreOpacity went backwards at ${p.toFixed(2)}`);
      assert.ok(v <= 1, `coreOpacity overshot at ${p.toFixed(2)}`);
      prev = v;
    }
  });

  it("rotates quicker while the dive is live than once inside", () => {
    assert.ok(coreSpin(10, false) > coreSpin(10, true));
    assert.ok(coreSpin(0, true) === 0);
  });

  it("has a positive rest size for every sign's sprite", () => {
    assert.ok(CORE_LOCAL_SIZE > 0.5);
  });

  it("lifts a dark accent (scorpio) so the core stays readable", () => {
    // Scorpio's palette accent is a near-wine red; on screen the landing had
    // nothing to look at. It must come out measurably brighter.
    const scorpio = { accent: "#8a3030", chest: "#e8c8c0" };
    const lifted = coreAccent(scorpio);
    assert.ok(
      hexLuma(lifted) > hexLuma(scorpio.accent) + 0.15,
      `expected a real lift, got ${lifted} (luma ${hexLuma(lifted).toFixed(2)})`,
    );
    assert.equal(coreAccent(scorpio), lifted, "must be deterministic");

    // A bright accent (sagittarius) barely moves, so verified signs are unaffected.
    const sag = { accent: "#c4a05a", chest: "#efe4f4" };
    assert.ok(Math.abs(hexLuma(coreAccent(sag)) - hexLuma(sag.accent)) < 0.12);
  });

  it("never returns something that is not a colour token", () => {
    for (const palette of [
      { accent: "#8a3030", chest: "#e8c8c0" },
      { accent: "#c4a05a", chest: "#efe4f4" },
      { accent: "#7ec8d0", chest: "#e4f4f6" },
    ]) {
      assert.match(coreAccent(palette), /^#[0-9a-f]{6}$/);
    }
  });
});
