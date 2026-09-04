/**
 * TDD tests for BirthChat sign-slide animation math.
 *
 * Stars stay on-screen: arrival-gated camera-space offset, NDC 0.35,
 * desktop right vs phone lift, clamp, soft scale. Plate stays opaque.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  lerpToward,
  computePlateOpacity,
  computeBirthChatSlide,
} from "./birthchat-slide.ts";

const PLATE = 16.5;
const ASPECT_WIDE = 16 / 9;
const FOV = 64;
const DEPTH = 26;

function halfExtents(fov: number, depth: number, aspect: number) {
  const halfH = Math.tan((fov * Math.PI) / 360) * depth;
  return { halfH, halfW: halfH * aspect };
}

const typical = {
  fov: FOV,
  sitCameraZ: DEPTH,
  aspect: ASPECT_WIDE,
  plateWide: PLATE,
  plateAspect: ASPECT_WIDE,
  currentScale: 1.4,
};

describe("computeBirthChatSlide", () => {
  it("not picked → offset {0,0} and scale 1", () => {
    const s = computeBirthChatSlide({
      ...typical,
      picked: false,
      travelT: 0.5,
      stationT: 0.5,
      cssWidth: 1280,
    });
    assert.strictEqual(s.offsetX, 0);
    assert.strictEqual(s.offsetY, 0);
    assert.strictEqual(s.targetScale, 1);
  });

  it("picked, not arrived → offset {0,0} even if camera-space |z| is huge", () => {
    const s = computeBirthChatSlide({
      ...typical,
      picked: true,
      travelT: 0,
      stationT: 0.5,
      sitCameraZ: 200,
      cssWidth: 1280,
    });
    assert.strictEqual(s.offsetX, 0);
    assert.strictEqual(s.offsetY, 0);
    assert.ok(s.targetScale > 1, `expected picked scale, got ${s.targetScale}`);
  });

  it("picked, arrived, desktop → x matches 0.35 * halfW when 1.4 fits, y === 0", () => {
    const s = computeBirthChatSlide({
      ...typical,
      picked: true,
      travelT: 0.5,
      stationT: 0.5,
      cssWidth: 1280,
      currentScale: 1.4,
    });
    const { halfW } = halfExtents(FOV, DEPTH, ASPECT_WIDE);
    const expected = 0.35 * halfW;
    assert.ok(s.offsetX > 0, `expected positive X, got ${s.offsetX}`);
    assert.strictEqual(s.offsetY, 0);
    assert.ok(Math.abs(s.offsetX - expected) < 1e-9, `expected ${expected}, got ${s.offsetX}`);
    assert.strictEqual(s.targetScale, 1.4);
  });

  it("picked, arrived, phone → x === 0, y matches 0.35 * halfH when scale fits", () => {
    const s = computeBirthChatSlide({
      ...typical,
      picked: true,
      travelT: 0.5,
      stationT: 0.5,
      cssWidth: 390,
      currentScale: 1.1,
    });
    const { halfH } = halfExtents(FOV, DEPTH, ASPECT_WIDE);
    assert.strictEqual(s.offsetX, 0);
    assert.ok(s.offsetY > 0, `expected positive Y, got ${s.offsetY}`);
    const expected = 0.35 * halfH;
    assert.ok(
      Math.abs(s.offsetY - expected) < 1e-9 || s.offsetY <= expected,
      `y should match or clamp below ${expected}, got ${s.offsetY}`,
    );
  });

  it("uses abs(sitCameraZ) only — unused world-Z cannot change the result", () => {
    const a = computeBirthChatSlide({
      ...typical,
      picked: true,
      travelT: 0.5,
      stationT: 0.5,
      sitCameraZ: 26,
      cssWidth: 1280,
    });
    const b = computeBirthChatSlide({
      ...typical,
      picked: true,
      travelT: 0.5,
      stationT: 0.5,
      sitCameraZ: -26,
      cssWidth: 1280,
    });
    assert.strictEqual(a.offsetX, b.offsetX);
    assert.strictEqual(a.offsetY, b.offsetY);
  });

  it("clamps so |offset.x| + plateHalfX stays inside VIEW_MARGIN", () => {
    const fov = 64;
    const depth = 26;
    const aspect = 1;
    const currentScale = 1.4;
    const s = computeBirthChatSlide({
      picked: true,
      travelT: 0,
      stationT: 0,
      fov,
      sitCameraZ: depth,
      aspect,
      cssWidth: 1280,
      plateWide: PLATE,
      plateAspect: ASPECT_WIDE,
      currentScale,
    });
    const { halfW } = halfExtents(fov, depth, aspect);
    const plateHalfX = (PLATE / 2) * currentScale;
    assert.ok(0.35 * halfW + plateHalfX > halfW * 0.92, "fixture must need a clamp");
    assert.ok(
      Math.abs(s.offsetX) + plateHalfX <= halfW * 0.92 + 1e-9,
      `offset ${s.offsetX} + half ${plateHalfX} exceeds ${halfW * 0.92}`,
    );
  });

  it("uses soft scale 1.1 when 1.4 fails the fit test", () => {
    const s = computeBirthChatSlide({
      picked: true,
      travelT: 0,
      stationT: 0,
      fov: 50,
      sitCameraZ: 12,
      aspect: 1,
      cssWidth: 800,
      plateWide: PLATE,
      plateAspect: ASPECT_WIDE,
      currentScale: 1.1,
    });
    assert.strictEqual(s.targetScale, 1.1);
  });

  it("wide desktop typical frustum → target scale 1.4", () => {
    const s = computeBirthChatSlide({
      ...typical,
      picked: true,
      travelT: 0.5,
      stationT: 0.5,
      cssWidth: 1280,
    });
    assert.strictEqual(s.targetScale, 1.4);
  });

  it("depth near zero → rest offset", () => {
    const s = computeBirthChatSlide({
      ...typical,
      picked: true,
      travelT: 0.5,
      stationT: 0.5,
      sitCameraZ: 1e-4,
      cssWidth: 1280,
    });
    assert.strictEqual(s.offsetX, 0);
    assert.strictEqual(s.offsetY, 0);
  });
});

describe("lerpToward", () => {
  it("moves current value toward target each frame", () => {
    const result = lerpToward({ current: 0, target: 10, dt: 0.016, rate: 2.2 });
    assert.ok(result > 0 && result < 10, `expected value between 0 and 10, got ${result}`);
  });

  it("converges to target after many frames", () => {
    let val = 0;
    for (let i = 0; i < 300; i++) {
      val = lerpToward({ current: val, target: 5, dt: 0.016, rate: 2.2 });
    }
    assert.ok(Math.abs(val - 5) < 0.001, `expected ~5 after 300 frames, got ${val}`);
  });

  it("converges to 0 when target is 0 (back transition)", () => {
    let val = 5;
    for (let i = 0; i < 300; i++) {
      val = lerpToward({ current: val, target: 0, dt: 0.016, rate: 2.2 });
    }
    assert.ok(Math.abs(val) < 0.001, `expected ~0 after 300 frames, got ${val}`);
  });

  it("never overshoots the target", () => {
    let val = 0;
    const target = 3;
    for (let i = 0; i < 500; i++) {
      val = lerpToward({ current: val, target, dt: 0.016, rate: 2.2 });
      assert.ok(val <= target + 1e-10, `overshot target at frame ${i}: ${val}`);
    }
  });

  it("clamps dt to prevent frame-spike instability", () => {
    const result = lerpToward({ current: 0, target: 10, dt: 999, rate: 2.2 });
    assert.ok(result <= 10 + 1e-10, `value overshot with large dt: ${result}`);
  });
});

describe("computePlateOpacity (plate never fades)", () => {
  it("is 1 when held and plate is on at full reveal", () => {
    const op = computePlateOpacity({ plateOn: true, held: true, focused: true, fade: 1, bornIn: 1, morphLevel: 0 });
    assert.strictEqual(op, 1);
  });

  it("is 1 when held at full morph — plate does NOT fade as glyph forms", () => {
    const op = computePlateOpacity({ plateOn: true, held: true, focused: true, fade: 1, bornIn: 1, morphLevel: 1 });
    assert.strictEqual(op, 1);
  });

  it("is the same at morphLevel 0 and morphLevel 1 — no plateMorphFade applied", () => {
    const atZero = computePlateOpacity({ plateOn: true, held: true, focused: true, fade: 1, bornIn: 1, morphLevel: 0 });
    const atOne = computePlateOpacity({ plateOn: true, held: true, focused: true, fade: 1, bornIn: 1, morphLevel: 1 });
    assert.strictEqual(atZero, atOne, "morphLevel must not affect plate opacity");
  });

  it("is 0 when plateOn is false", () => {
    const op = computePlateOpacity({ plateOn: false, held: true, focused: true, fade: 1, bornIn: 1, morphLevel: 1 });
    assert.strictEqual(op, 0);
  });

  it("scales with bornIn reveal (plate fades IN on first approach, not during morph)", () => {
    const partial = computePlateOpacity({ plateOn: true, held: true, focused: true, fade: 1, bornIn: 0.5, morphLevel: 1 });
    const full = computePlateOpacity({ plateOn: true, held: true, focused: true, fade: 1, bornIn: 1, morphLevel: 1 });
    assert.ok(partial < full, `expected bornIn 0.5 to give lower opacity than 1.0`);
  });
});
