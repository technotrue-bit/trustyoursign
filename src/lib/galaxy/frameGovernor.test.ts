import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HALF_RATE_MIN_MS,
  HIGH_REFRESH_MEDIAN_MS,
  decideFrameGovernor,
  median,
  missRatioAgainst,
  windowIntervals,
  type FrameGovernorInput,
} from "./frameGovernor.ts";

function base(over: Partial<FrameGovernorInput> = {}): FrameGovernorInput {
  return {
    paused: false,
    handsOn: false,
    traveling: false,
    seeking: false,
    introPlaying: false,
    documentHidden: false,
    intervalsMs: Array.from({ length: 120 }, () => 16.7),
    ...over,
  };
}

describe("frameGovernor", () => {
  it("median and window helpers", () => {
    assert.equal(median([]), 16.7);
    assert.equal(median([10, 20, 30]), 20);
    assert.equal(median([10, 20]), 15);
    const w = windowIntervals([5, 5, 5, 5, 5, 5, 5, 5], 20);
    assert.ok(w.length >= 4);
    assert.ok(w.reduce((a, b) => a + b, 0) >= 20);
  });

  it("goes demand when paused and idle, always when anything is moving", () => {
    const idle = decideFrameGovernor(base({ paused: true }));
    assert.equal(idle.mode, "demand");
    assert.equal(idle.renderEveryNth, 1);

    const hands = decideFrameGovernor(base({ paused: true, handsOn: true }));
    assert.equal(hands.mode, "always");

    const seek = decideFrameGovernor(base({ paused: true, seeking: true }));
    assert.equal(seek.mode, "always");

    const intro = decideFrameGovernor(base({ paused: true, introPlaying: true }));
    assert.equal(intro.mode, "always");

    const fly = decideFrameGovernor(base({ paused: false }));
    assert.equal(fly.mode, "always");
  });

  it("stops rendering intent while the document is hidden", () => {
    const d = decideFrameGovernor(base({ documentHidden: true, paused: false }));
    assert.equal(d.mode, "demand");
    assert.equal(d.halfRate.active, false);
  });

  it("half-rates a 120Hz panel that is missing vsync, with hysteresis", () => {
    // 8.3 ms target; sprinkle misses above 8.3 * 1.35 ≈ 11.2
    const intervals = Array.from({ length: 240 }, (_, i) => (i % 8 === 0 ? 20 : 8.3));
    assert.ok(median(intervals) < HIGH_REFRESH_MEDIAN_MS);
    assert.ok(missRatioAgainst(windowIntervals(intervals), 1000 / 120) > 0.1);

    const entered = decideFrameGovernor(base({ intervalsMs: intervals }), undefined, 1000);
    assert.equal(entered.highRefresh, true);
    assert.equal(entered.renderEveryNth, 2);
    assert.equal(entered.halfRate.active, true);

    // Still half-rate before min dwell even if intervals recover.
    const good = Array.from({ length: 240 }, () => 8.3);
    const early = decideFrameGovernor(
      base({ intervalsMs: good }),
      entered.halfRate,
      1000 + HALF_RATE_MIN_MS - 100,
    );
    assert.equal(early.renderEveryNth, 2);

    const left = decideFrameGovernor(
      base({ intervalsMs: good }),
      entered.halfRate,
      1000 + HALF_RATE_MIN_MS + 50,
    );
    assert.equal(left.renderEveryNth, 1);
    assert.equal(left.halfRate.active, false);
  });

  it("never half-rates a 60Hz panel", () => {
    const intervals = Array.from({ length: 120 }, (_, i) => (i % 5 === 0 ? 40 : 16.7));
    const d = decideFrameGovernor(base({ intervalsMs: intervals }), undefined, 5000);
    assert.equal(d.highRefresh, false);
    assert.equal(d.renderEveryNth, 1);
  });
});
