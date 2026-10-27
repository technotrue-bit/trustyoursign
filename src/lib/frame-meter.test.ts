import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { frameMeterEnabled, summarizeFrames } from "./frame-meter.ts";

describe("frame meter", () => {
  it("reads a steady 60Hz second as 60fps with no slow frames", () => {
    const s = summarizeFrames(Array(60).fill(1000 / 60), 60);
    assert.equal(s.fps, 60);
    assert.equal(s.slowPct, 0);
    assert.equal(Math.round(s.p95Ms), 17);
    assert.equal(s.drawsPerSec, 60);
  });

  it("counts frames over 1.5x the 60Hz budget as slow and reports p95", () => {
    const intervals = [...Array(90).fill(16.7), ...Array(10).fill(50)];
    const s = summarizeFrames(intervals, 50);
    assert.equal(s.slowPct, 10);
    assert.equal(s.p95Ms, 50);
    assert.ok(s.fps < 60 && s.fps > 45);
    // Draws per second follow the draws counted over the same span, not rAF.
    assert.equal(s.drawsPerSec, Math.round(50 / (intervals.reduce((a, b) => a + b, 0) / 1000)));
  });

  it("returns zeros for an empty sample", () => {
    assert.deepEqual(summarizeFrames([], 0), { fps: 0, p95Ms: 0, slowPct: 0, drawsPerSec: 0 });
  });

  it("turns on only for ?fps=1", () => {
    assert.equal(frameMeterEnabled("?fps=1"), true);
    assert.equal(frameMeterEnabled("?sign=leo&fps=1"), true);
    assert.equal(frameMeterEnabled("?fps=0"), false);
    assert.equal(frameMeterEnabled(""), false);
  });
});
