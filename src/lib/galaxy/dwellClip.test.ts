import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DWELL_CLIPS, DWELL_STILL_SEC } from "./dwellClip.ts";
import { templeIntro } from "./intro.ts";
import { stationT } from "./temple.ts";
import {
  enterSignGalaxy,
  galaxyTravel,
  resetTravel,
  seekSign,
  setPaused,
  stepAutoSign,
} from "./travel.ts";

const T0 = 10_000;

describe("dwell clip map", () => {
  it("attaches a life clip to Aries only", () => {
    assert.deepEqual(Object.keys(DWELL_CLIPS), ["aries"]);
    assert.equal(DWELL_CLIPS.aries, "/signs/aries-life.mp4");
    assert.ok(DWELL_STILL_SEC >= 2 && DWELL_STILL_SEC <= 3);
  });
});

describe("stepAutoSign dwell", () => {
  let now = T0;
  let originalNow: () => number;
  let introDone = false;

  beforeEach(() => {
    originalNow = performance.now.bind(performance);
    now = T0;
    performance.now = () => now;
    introDone = templeIntro.done;
    resetTravel(false);
    galaxyTravel.paused = false;
    galaxyTravel.handsOn = false;
    galaxyTravel.dragging = false;
    galaxyTravel.hold = 0;
  });

  afterEach(() => {
    performance.now = originalNow;
    templeIntro.done = introDone;
    setPaused(false);
    resetTravel(false);
  });

  function stepAt(
    ms: number,
    opts?: { handsOn?: boolean; reduced?: boolean; traveling?: boolean },
  ) {
    now = T0 + ms;
    return stepAutoSign(1 / 60, {
      canAdvance: true,
      traveling: opts?.traveling ?? false,
      handsOn: opts?.handsOn ?? false,
      reduced: opts?.reduced ?? false,
    });
  }

  it("does not play or walk on the first moment Aries is settled", () => {
    assert.equal(stepAt(0), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.seek, null);
  });

  it("holds the still plate through the dwell, then arms the clip without walking", () => {
    assert.equal(stepAt(2_400), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(stepAt(2_500), false);
    assert.equal(galaxyTravel.dwellClipIndex, 0);
    assert.equal(galaxyTravel.seek, null);
  });

  it("does not cut the clip short to chase the 7s walk", () => {
    assert.equal(stepAt(2_500), false);
    assert.equal(stepAt(8_000), false);
    assert.equal(galaxyTravel.dwellClipIndex, 0);
    assert.equal(galaxyTravel.dwellClipDone, false);
    assert.equal(galaxyTravel.seek, null);
  });

  it("walks to the next sign once the clip has ended", () => {
    galaxyTravel.dwellClipIndex = 0;
    galaxyTravel.dwellClipDone = true;
    assert.equal(stepAt(100), true);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.seek, stationT(1));
    assert.equal(galaxyTravel.selectionHoldLeft, null);
  });

  it("keeps Taurus on the 7s walk with no clip", () => {
    galaxyTravel.t = stationT(1);
    galaxyTravel.tTarget = stationT(1);
    assert.equal(stepAt(6_900), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.seek, null);
    assert.equal(stepAt(7_000), true);
    assert.equal(galaxyTravel.seek, stationT(2));
    assert.equal(galaxyTravel.dwellClipIndex, null);
  });

  it("does not walk Pisces off the end of the corridor", () => {
    galaxyTravel.t = stationT(11);
    galaxyTravel.tTarget = stationT(11);
    assert.equal(stepAt(7_000), false);
    assert.equal(galaxyTravel.seek, null);
    assert.equal(galaxyTravel.dwellClipIndex, null);
  });

  it("does not arm a clip while the camera is still short of the station", () => {
    galaxyTravel.t = 0.03;
    galaxyTravel.tTarget = 0.03;
    assert.equal(stepAt(3_000), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(stepAt(7_000), true);
    assert.equal(galaxyTravel.dwellClipIndex, null);
  });

  it("kills an in-progress clip when hands are on, and does not walk", () => {
    galaxyTravel.dwellClipIndex = 0;
    assert.equal(stepAt(4_000, { handsOn: true }), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.seek, null);
  });

  it("kills an in-progress clip while dragging or flying", () => {
    galaxyTravel.dwellClipIndex = 0;
    galaxyTravel.dragging = true;
    assert.equal(stepAt(4_000), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);

    galaxyTravel.dwellClipIndex = 0;
    galaxyTravel.dragging = false;
    galaxyTravel.hold = 1;
    assert.equal(stepAt(4_000), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.seek, null);
  });

  it("does not start a clip while exploring, and kills one already armed", () => {
    galaxyTravel.explorePhase = "fading";
    assert.equal(stepAt(4_000), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);

    galaxyTravel.explorePhase = "diving";
    galaxyTravel.dwellClipIndex = 0;
    assert.equal(stepAt(4_000), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.seek, null);
  });

  it("freezes an armed clip while paused instead of clearing it", () => {
    galaxyTravel.dwellClipIndex = 0;
    setPaused(true);
    assert.equal(stepAutoSign(1 / 60, { canAdvance: true, reduced: false }), false);
    assert.equal(galaxyTravel.dwellClipIndex, 0);
    assert.equal(galaxyTravel.dwellClipDone, false);
    setPaused(false);
    galaxyTravel.dwellClipDone = true;
    assert.equal(stepAt(500), true);
    assert.equal(galaxyTravel.seek, stationT(1));
  });

  it("skips the clip under reduced motion and walks after the same still dwell", () => {
    assert.equal(stepAt(2_400, { reduced: true }), false);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.seek, null);
    assert.equal(stepAt(2_500, { reduced: true }), true);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.seek, stationT(1));
  });

  it("does not walk a clicked sign until the selection hold ends", () => {
    galaxyTravel.selectionHoldLeft = 5_000;
    assert.equal(stepAt(2_500), false);
    assert.equal(galaxyTravel.dwellClipIndex, 0);
    assert.equal(galaxyTravel.seek, null);
    galaxyTravel.dwellClipDone = true;
    assert.equal(stepAt(8_000), false);
    assert.equal(galaxyTravel.seek, null);
    galaxyTravel.selectionHoldLeft = null;
    assert.equal(stepAt(8_000), true);
    assert.equal(galaxyTravel.seek, stationT(1));
  });

  it("still blocks the 7s walk during a selection hold on a sign with no clip", () => {
    galaxyTravel.t = stationT(1);
    galaxyTravel.tTarget = stationT(1);
    galaxyTravel.selectionHoldLeft = 5_000;
    assert.equal(stepAt(8_000), false);
    assert.equal(galaxyTravel.seek, null);
    assert.equal(galaxyTravel.dwellClipIndex, null);
  });

  it("kills the clip when a swipe seeks another sign", () => {
    galaxyTravel.dwellClipIndex = 0;
    galaxyTravel.dwellClipDone = false;
    seekSign(4);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.dwellClipDone, false);
    assert.equal(galaxyTravel.seek, stationT(4));
  });

  it("kills the clip when Enter starts the dive", () => {
    templeIntro.done = true;
    galaxyTravel.dwellClipIndex = 0;
    const started = enterSignGalaxy(0);
    assert.equal(started, true);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(galaxyTravel.explorePhase, "fading");
  });
});
