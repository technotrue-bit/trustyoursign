import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { skipIntro, templeIntro } from "./intro.ts";
import { NAVE, stationT } from "./temple.ts";
import {
  HANDOFF_HALF,
  NEAR_FADE_END,
  plateNearFade,
  plateOwnership,
  plateWeight,
} from "./signField.ts";
import {
  GLIDE_SEC,
  MAX_FLY_T,
  STATION_GAP_T,
  WHEEL_AHEAD,
  applyFlyDelta,
  applyWheel,
  cameraSettledOn,
  dwellClipMayPlay,
  easeArrive,
  endFly,
  galaxyTravel,
  resetTravel,
  seekSeconds,
  settleCorridor,
  settleStation,
  stepSeek,
} from "./travel.ts";

const DT = 1 / 60;
let now = 50_000;
let originalNow: () => number;

function openSkyAt(index: number) {
  templeIntro.t = Math.max(templeIntro.t, 0.4);
  skipIntro();
  resetTravel(false);
  galaxyTravel.birth = 1;
  galaxyTravel.busy = false;
  galaxyTravel.t = stationT(index);
  galaxyTravel.tTarget = stationT(index);
}

/** The rig's seek loop, headless: returns every frame's t. */
function fly(maxSec = 6) {
  const frames: number[] = [];
  for (let i = 0; i < maxSec / DT && galaxyTravel.seek != null; i += 1) {
    now += DT * 1000;
    const before = galaxyTravel.t;
    const s = stepSeek(galaxyTravel.t, DT);
    galaxyTravel.t = s.t;
    galaxyTravel.vel = (s.t - before) / DT;
    frames.push(s.t);
  }
  galaxyTravel.vel = 0;
  return frames;
}

/** Weights of all twelve plates for a camera at t, parked `rest` units behind its station. */
function weights(t: number, rest: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const s = (t - stationT(i)) * 11;
    return plateWeight(s, rest, rest - s * NAVE);
  });
}

beforeEach(() => {
  originalNow = performance.now.bind(performance);
  performance.now = () => now;
  openSkyAt(3);
});

afterEach(() => {
  performance.now = originalNow;
  resetTravel(false);
});

describe("one wheel notch", () => {
  it("eases exactly one sign, lands at rest, and never outruns MAX_FLY", () => {
    applyWheel(100);
    assert.equal(galaxyTravel.seek, stationT(4));
    const frames = fly();
    assert.equal(galaxyTravel.t, stationT(4));
    let prev = stationT(3);
    let peak = 0;
    for (const t of frames) {
      assert.ok(t >= prev - 1e-9, "a notch never backs up");
      assert.ok(t <= stationT(4) + 1e-9, "a notch never overshoots");
      peak = Math.max(peak, (t - prev) / DT);
      prev = t;
    }
    assert.ok(peak <= MAX_FLY_T * 1.02, `peak ${peak} over cap ${MAX_FLY_T}`);
    const secs = frames.length * DT;
    assert.ok(secs >= GLIDE_SEC * 0.95, `glide took ${secs}s — that is a snap`);
  });

  it("a trackpad dribble of small deltas lands one sign, like a notch", () => {
    for (let i = 0; i < 30; i += 1) {
      now += 8;
      applyWheel(5);
    }
    fly();
    assert.equal(galaxyTravel.t, stationT(4));
  });

  it("a flick cannot queue more than WHEEL_AHEAD signs ahead of the camera", () => {
    for (let i = 0; i < 40; i += 1) {
      now += 8;
      applyWheel(60);
    }
    const aim = Math.round((galaxyTravel.seek ?? 0) / STATION_GAP_T);
    assert.ok(aim - 3 <= WHEEL_AHEAD, `flick queued ${aim - 3} signs`);
    assert.ok(aim - 3 >= 1);
  });

  it("scrolling back mid-glide returns to the sign it left", () => {
    applyWheel(100);
    for (let i = 0; i < 30; i += 1) {
      now += DT * 1000;
      const before = galaxyTravel.t;
      galaxyTravel.t = stepSeek(galaxyTravel.t, DT).t;
      galaxyTravel.vel = (galaxyTravel.t - before) / DT;
    }
    now += 400;
    applyWheel(-100);
    assert.equal(galaxyTravel.seek, stationT(3));
    fly();
    assert.equal(galaxyTravel.t, stationT(3));
  });
});

describe("one plate owns the frame", () => {
  for (const rest of [15, 32]) {
    it(`never stacks two plates across a glide (rest ${rest})`, () => {
      applyWheel(100);
      const frames = fly();
      for (const t of [stationT(3), ...frames]) {
        const w = weights(t, rest).sort((a, b) => b - a);
        assert.ok(w[2]! < 0.01, `three plates live at t=${t}`);
        // Two plates only ever share the frame inside the short midpoint dissolve.
        const s = (t - stationT(3)) * 11;
        if (Math.abs(s - 0.5) > HANDOFF_HALF) assert.ok(w[1]! < 0.02, `stack at s=${s}: ${w}`);
      }
    });
  }

  it("parked, the neighbours are dark", () => {
    const w = weights(stationT(5), 32);
    assert.equal(w[5], 1);
    assert.equal(w[4], 0);
    assert.equal(w[6], 0);
  });

  it("hands the frame over at the midpoint", () => {
    assert.equal(plateOwnership(0), 1);
    assert.ok(Math.abs(plateOwnership(0.5) - 0.5) < 1e-9);
    assert.equal(plateOwnership(0.5 + HANDOFF_HALF), 0);
  });

  it("dissolves a plate before the camera can fly into it", () => {
    assert.equal(plateNearFade(15, 15), 1);
    assert.equal(plateNearFade(15, 15 / NEAR_FADE_END), 0);
    assert.equal(plateNearFade(15, -2), 0, "behind the lens");
    // A pinch zoom-out lag does not dim the parked hero.
    assert.equal(plateWeight(0, 15, 8), 1);
  });
});

describe("hands-off landing", () => {
  it("heading forward past the commit lands the next sign", () => {
    assert.equal(settleStation(stationT(3) + 0.2 * STATION_GAP_T, 1), 4);
    assert.equal(settleStation(stationT(3) + 0.05 * STATION_GAP_T, 1), 3);
    assert.equal(settleStation(stationT(4) - 0.2 * STATION_GAP_T, -1), 3);
    assert.equal(settleStation(stationT(3) + 0.4 * STATION_GAP_T, 0), 3);
  });

  it("a released drag glides onto the sign it was heading for", () => {
    applyFlyDelta(120, 0, false);
    endFly();
    assert.ok(galaxyTravel.tTarget > stationT(3));
    galaxyTravel.t = galaxyTravel.tTarget;
    assert.equal(settleCorridor(galaxyTravel.t), true);
    assert.equal(galaxyTravel.seek, stationT(4));
    fly();
    assert.equal(galaxyTravel.t, stationT(4));
  });
});

describe("seek easing", () => {
  it("is smoothstep from rest and picks up a moving camera without a kink", () => {
    assert.equal(easeArrive(0, 0, 1, 0, 1), 0);
    assert.equal(easeArrive(1, 0, 1, 0.4, 1), 1);
    assert.ok(Math.abs(easeArrive(0.5, 0, 1, 0, 1) - 0.5) < 1e-12);
    const h = 1e-5;
    const slope = (easeArrive(h, 0, 1, 0.4, 2) - easeArrive(0, 0, 1, 0.4, 2)) / (h * 2);
    assert.ok(Math.abs(slope - 0.4) < 1e-3, `starts at ${slope}, carried 0.4`);
  });

  it("reduced motion cuts instead of travelling", () => {
    assert.equal(seekSeconds(1, "glide", true), 0);
    assert.equal(seekSeconds(3, "direct", true), 0);
    assert.equal(seekSeconds(1, "glide"), GLIDE_SEC);
  });
});

describe("the life clip refuses unless the camera is settled", () => {
  function armAries() {
    openSkyAt(0);
    galaxyTravel.dwellClipIndex = 0;
    galaxyTravel.dwellClipDone = false;
  }

  it("plays only when parked on the station with nothing moving", () => {
    armAries();
    assert.equal(cameraSettledOn(0), true);
    assert.equal(dwellClipMayPlay(0), true);

    galaxyTravel.vel = 0.01;
    assert.equal(dwellClipMayPlay(0), false, "still sliding");
    galaxyTravel.vel = 0;

    galaxyTravel.t = stationT(0) + 0.01;
    galaxyTravel.tTarget = galaxyTravel.t;
    assert.equal(dwellClipMayPlay(0), false, "near is not on");
    galaxyTravel.t = stationT(0);
    galaxyTravel.tTarget = stationT(0);

    galaxyTravel.traveling = true;
    assert.equal(dwellClipMayPlay(0), false, "camera still catching up");
    galaxyTravel.traveling = false;
    assert.equal(dwellClipMayPlay(0), true);
  });

  it("dies the instant the wheel moves", () => {
    armAries();
    applyWheel(100);
    assert.equal(galaxyTravel.dwellClipIndex, null);
    assert.equal(dwellClipMayPlay(0), false);
  });

  it("dies the instant a drag starts", () => {
    armAries();
    applyFlyDelta(0, -40, true);
    assert.equal(galaxyTravel.dwellClipIndex, null);
  });

  it("dies on a tiny trackpad nudge too", () => {
    armAries();
    applyWheel(2);
    assert.equal(galaxyTravel.dwellClipIndex, null);
  });
});
