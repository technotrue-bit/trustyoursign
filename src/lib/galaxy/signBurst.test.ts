import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CONSTELLATIONS } from "./constellations";
import {
  BURST_END,
  BURST_FULL,
  BURST_HOLD,
  BURST_IGNITE,
  DISSOLVE_END,
  DISSOLVE_NOISE_SPAN,
  DISSOLVE_RADIUS_MAX,
  PLATE_DISSOLVE_GLSL,
  burstDissolve,
  burstFlashSize,
  burstIgnition,
  burstImpulse,
  burstParams,
  burstPulse,
  burstPulseReduced,
  burstRayCount,
  burstSpriteSize,
  clearBurstParamCache,
  dissolveMaskDistance,
  dissolveSeedPhase,
  flashPulse,
  plateDissolveUniforms,
  plateHubUv,
} from "./signBurst";

const SIGNS = CONSTELLATIONS.map((c) => c.id);

describe("signBurst", () => {
  it("is a pulse, not a plateau: it rises, holds, and is gone before the landing", () => {
    assert.equal(burstPulse(0), 0);
    assert.equal(burstPulse(BURST_IGNITE), 0);
    assert.equal(burstPulse(BURST_END), 0);
    assert.equal(burstPulse(0.96), 0, "must not still be burning at t≈4.0s (M5)");
    // Full through the burst window the capture actually samples (t≈1.2–2.4s).
    for (const p of [0.3, 0.37, 0.48, 0.58]) {
      assert.ok(burstPulse(p) > 0.99, `pulse should be at peak at p=${p}`);
    }
    assert.ok(burstPulse(BURST_FULL - 0.02) > 0.9);
    let prev = 0;
    for (let p = 0; p <= BURST_FULL; p += 0.01) {
      const v = burstPulse(p);
      assert.ok(v >= prev - 1e-9, `pulse went backwards at ${p.toFixed(2)}`);
      assert.ok(v <= 1 + 1e-9);
      prev = v;
    }
    prev = 1;
    for (let p = BURST_HOLD; p <= 1.0001; p += 0.01) {
      const v = burstPulse(p);
      assert.ok(v <= prev + 1e-9, `decay went forwards at ${p.toFixed(2)}`);
      prev = v;
    }
  });

  it("lights the figure before the blast consumes it (M4 sample, t≈0.9s)", () => {
    // The capture lands on p≈0.20–0.28 at t≈0.9s.
    assert.ok(burstIgnition(0.2) > 0.5, `ignition at p=0.2 was ${burstIgnition(0.2)}`);
    assert.ok(burstIgnition(0.27) > 0.95, `ignition at p=0.27 was ${burstIgnition(0.27)}`);
    assert.ok(burstDissolve(0.27) < 0.5, "the painting must not be mostly gone at t≈0.9s");
    assert.equal(burstDissolve(0), 0);
    assert.equal(burstDissolve(DISSOLVE_END), 1);
    assert.ok(burstDissolve(0.3) > burstDissolve(0.2));
    // M11: the front is still short of the frame at the burst peak — the figure
    // is consumed *through and after* the light, not before it arrives.
    assert.ok(burstDissolve(BURST_FULL) < 0.3, `front at the peak was ${burstDissolve(BURST_FULL)}`);
    assert.ok(DISSOLVE_END > BURST_FULL, "the dissolve must outlive the burst's peak");
    assert.ok(burstDissolve(0.36) < 0.6, "the figure must still be half there at the peak as the frames see it");
  });

  it("flashes in fast and is gone again inside the burst window", () => {
    assert.equal(flashPulse(0), 0);
    assert.ok(Math.abs(flashPulse(BURST_FULL) - 1) < 1e-9);
    assert.equal(flashPulse(BURST_HOLD), 0, "the flash is short — it must not hold");
    assert.ok(flashPulse(BURST_FULL + 0.06) < 0.5);
    // ~120ms in on a 4.5s dive is a very short ramp, and ~500ms out.
    const upFrames = [...Array(40).keys()].filter((i) => flashPulse(BURST_FULL - i * 0.002) > 0.01);
    assert.ok(upFrames.length <= 14, "flash ramps in too slowly");
  });

  it("degrades to a slow brighten with no spike under reduced motion", () => {
    assert.equal(burstPulseReduced(0), 0);
    assert.equal(burstPulseReduced(1), 0);
    assert.ok(burstPulseReduced(0.5) > 0.3);
    // Slower than the full burst: at the burst's peak it is still climbing.
    assert.ok(burstPulseReduced(0.2) < burstPulse(0.2));
    let prev = 0;
    for (let p = 0; p <= 0.6; p += 0.01) {
      const v = burstPulseReduced(p);
      assert.ok(v >= prev - 1e-9);
      assert.ok(v <= 1 + 1e-9);
      prev = v;
    }
  });

  it("keeps the impulse and the sprite size bounded by the pulse", () => {
    assert.equal(burstImpulse(0), 0);
    assert.equal(burstImpulse(0.96), 0);
    const params = burstParams("aries");
    assert.equal(burstSpriteSize(0, params), 0);
    assert.ok(burstSpriteSize(1, params) > 5, "the burst must fill the frame at the peak");
    assert.ok(burstSpriteSize(0.5, params) < burstSpriteSize(1, params));
    assert.equal(burstFlashSize(0, params), 0);
    assert.ok(burstFlashSize(1, params) > 2 && burstFlashSize(1, params) < params.sizeMax);
  });

  it("gives every sign its own burst, byte-identical on repeat (M10)", () => {
    clearBurstParamCache();
    const first = burstParams("aries");
    const again = burstParams("aries");
    assert.equal(first, again, "cached: no re-allocation per frame");
    assert.equal(JSON.stringify(first), JSON.stringify(again));
    const taurus = burstParams("taurus");
    assert.notEqual(JSON.stringify(first), JSON.stringify(taurus), "aries must differ from taurus");
    const seen = new Map<string, string>();
    for (const id of SIGNS) {
      const json = JSON.stringify(burstParams(id));
      assert.equal(seen.get(json), undefined, `${id} shares a burst with ${seen.get(json)}`);
      seen.set(json, id);
    }
    // Fresh cache, same numbers — a reload must not change the burst.
    clearBurstParamCache();
    assert.equal(JSON.stringify(burstParams("aries")), JSON.stringify(first));
  });

  it("halves the ray count on a small GPU, never below ten", () => {
    for (const id of SIGNS) {
      const params = burstParams(id);
      assert.ok(params.rays >= 18 && params.rays <= 44, `${id} ray count out of bounds`);
      const small = burstRayCount(params, true);
      const full = burstRayCount(params, false);
      assert.equal(full, params.rays);
      assert.ok(small >= 10 && small < full);
    }
  });

  it("measures the plate's ignition point from the alignment, not from a guess", () => {
    const match = { sx: 0.5, sy: 0.5, ox: 0, oy: 0.05 };
    const centre = plateHubUv(match, { x: 0, y: 0 }, 16.5, 16 / 9);
    assert.ok(Math.abs(centre.u - 0.5) < 1e-9);
    assert.ok(Math.abs(centre.v - 0.5) < 1e-9);
    // A hub left of and above the figure centre lands left of and above plate centre.
    const off = plateHubUv(match, { x: -8, y: 4 }, 16.5, 16 / 9);
    assert.ok(off.u < centre.u && off.v > centre.v);
    for (const id of SIGNS) {
      const params = burstParams(id);
      assert.ok(params.dissolveSoft > 0.05 && params.dissolveSoft < 0.2);
      assert.ok(params.dissolveNoise > 5);
    }
  });

  it("erodes the plate outward from the hub, and eats every corner by the end", () => {
    const params = burstParams("aries");
    const hub = { u: 0.42, v: 0.46 };
    const aspect = 16 / 9;
    // Inside the front: negative. Outside it: positive.
    assert.ok(dissolveMaskDistance(hub.u, hub.v, hub, aspect, 0.5, params) < 0);
    assert.ok(dissolveMaskDistance(0.02, 0.02, hub, aspect, 0.2, params) > 0);
    // The corner is eaten by the time the dissolve completes.
    assert.ok(dissolveMaskDistance(0.02, 0.02, hub, aspect, 1, params) < 0);
    assert.ok(DISSOLVE_RADIUS_MAX > Math.hypot(0.5 * aspect, 0.5));
    // The front only ever grows, so a fixed point's distance to it only shrinks.
    let prev = Number.POSITIVE_INFINITY;
    for (let d = 0; d <= 1.0001; d += 0.05) {
      const dist = dissolveMaskDistance(0.9, 0.9, hub, aspect, d, params);
      assert.ok(dist <= prev + 1e-9);
      prev = dist;
    }
  });

  it("shares ONE seed derivation between the tested mask and the plate shader", () => {
    const params = burstParams("aries");
    const uniforms = plateDissolveUniforms(params);
    // The shader's uniforms come from the same source the mask is tested with.
    assert.equal(uniforms.uSeed.value, dissolveSeedPhase(params.seed));
    assert.equal(uniforms.uNoise.value, params.dissolveNoise);
    assert.equal(uniforms.uRagged.value, params.dissolveRagged);
    assert.equal(uniforms.uSoft.value, params.dissolveSoft);
    assert.equal(uniforms.uRadius.value, DISSOLVE_RADIUS_MAX);
    // Mirror PLATE_DISSOLVE_GLSL line for line against those uniforms and compare
    // numbers with dissolveMaskDistance: the two call sites must agree exactly.
    const hub = { u: 0.42, v: 0.46 };
    const aspect = 16 / 9;
    const viaShader = (x: number, y: number, dissolve: number) => {
      const dx = (x - hub.u) * aspect;
      const dy = y - hub.v;
      const r = Math.hypot(dx, dy);
      const n =
        Math.sin(x * uniforms.uNoise.value + uniforms.uSeed.value) *
        Math.cos(y * (uniforms.uNoise.value * DISSOLVE_NOISE_SPAN) - uniforms.uSeed.value);
      const front = dissolve * uniforms.uRadius.value + n * uniforms.uRagged.value;
      return r - front;
    };
    const samples: [number, number][] = [
      [0.2, 0.3],
      [0.66, 0.5],
      [0.9, 0.12],
      [0.5, 0.5],
    ];
    for (const [x, y] of samples) {
      for (const d of [0, 0.2, 0.5, 0.8, 1]) {
        const fromMask = dissolveMaskDistance(x, y, hub, aspect, d, params);
        assert.ok(
          Math.abs(fromMask - viaShader(x, y, d)) < 1e-12,
          `shader and mask disagree at (${x}, ${y}) dissolve=${d}`,
        );
      }
    }
    // The GLSL the renderer splices in is this module's body, constants and all.
    assert.ok(PLATE_DISSOLVE_GLSL.includes(DISSOLVE_NOISE_SPAN.toFixed(2)));
    assert.ok(PLATE_DISSOLVE_GLSL.includes("uSeed"));
    // …and GalaxyIntro consumes both, rather than rebuilding the numbers inline.
    const introSrc = readFileSync(
      new URL("../../components/scene/GalaxyIntro.tsx", import.meta.url),
      "utf8",
    );
    assert.ok(
      introSrc.includes("plateDissolveUniforms("),
      "the plate shader must take its mask uniforms from signBurst",
    );
    assert.ok(
      introSrc.includes("PLATE_DISSOLVE_GLSL"),
      "the plate shader must run the shared GLSL body, not a hand-copied one",
    );
    assert.ok(!introSrc.includes("977"), "the old divergent seed derivation must be gone");
  });
});
