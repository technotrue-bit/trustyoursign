import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DUST_R_MAX,
  DUST_R_MIN,
  DUST_Z_FAR,
  DUST_Z_NEAR,
  buildFlightDust,
  dustOpacity,
  dustPoints,
} from "./flightDust";

describe("flightDust", () => {
  it("fills the flight corridor and keeps the centre channel clear", () => {
    const cloud = dustPoints(400);
    assert.equal(cloud.count, 400);
    assert.ok(cloud.zRange[0] >= DUST_Z_NEAR - 1e-6);
    assert.ok(cloud.zRange[1] <= DUST_Z_FAR + 1e-6);
    // Only the x/y radius is clamped to the ring bounds (the y axis is squashed).
    assert.ok(cloud.rRange[0] >= DUST_R_MIN * 0.78 - 1e-6, `inner radius ${cloud.rRange[0]}`);
    assert.ok(cloud.rRange[1] <= DUST_R_MAX + 1e-6);
    for (let i = 0; i < cloud.count; i++) {
      const z = cloud.positions[i * 3 + 2]!;
      assert.ok(z >= DUST_Z_NEAR && z <= DUST_Z_FAR);
      const x = cloud.positions[i * 3]!;
      const y = cloud.positions[i * 3 + 1]!;
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
      // No dust inside the core's channel.
      assert.ok(Math.hypot(x, y) > DUST_R_MIN * 0.75);
    }
  });

  it("is deterministic — the dust looks identical on every load", () => {
    const a = dustPoints(120).positions;
    const b = dustPoints(120).positions;
    assert.deepEqual(Array.from(a), Array.from(b));
  });

  it("builds a geometry with the per-point attributes the shader needs", () => {
    const geo = buildFlightDust(64);
    assert.equal(geo.getAttribute("position").count, 64);
    assert.equal(geo.getAttribute("aSize").count, 64);
    assert.equal(geo.getAttribute("aMag").count, 64);
    assert.equal(geo.getAttribute("aPhase").count, 64);
    geo.dispose();
  });

  it("stays invisible while the painted figure is the hero, then eases back inside", () => {
    assert.equal(dustOpacity(0, false), 0);
    let prev = dustOpacity(0, false);
    for (let f = 0.05; f <= 1.0001; f += 0.05) {
      const v = dustOpacity(f, false);
      assert.ok(v >= prev - 1e-9, `dust opacity went backwards at ${f.toFixed(2)}`);
      assert.ok(v >= 0 && v <= 1);
      prev = v;
    }
    assert.ok(dustOpacity(1, false) > 0.85);
    assert.ok(dustOpacity(1, true) < dustOpacity(1, false));
    assert.ok(dustOpacity(1, true) > 0);
  });
});
