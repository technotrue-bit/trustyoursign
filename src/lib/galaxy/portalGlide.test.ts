import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { signSteps } from "./constellations.ts";
import { skipIntro, templeIntro } from "./intro.ts";
import { stationT } from "./temple.ts";
import {
  GLIDE_SEC,
  MAX_FLY_T,
  STATION_GAP_T,
  enterSignGalaxy,
  galaxyTravel,
  portalActive,
  portalDirection,
  portalEnvelope,
  resetTravel,
  seekSign,
  stepSeek,
} from "./travel.ts";

const DT = 1 / 60;
let now = 90_000;
let originalNow: () => number;

function parkAt(index: number) {
  templeIntro.t = Math.max(templeIntro.t, 0.4);
  templeIntro.done = true;
  skipIntro();
  resetTravel(false);
  galaxyTravel.birth = 1;
  galaxyTravel.busy = false;
  galaxyTravel.t = stationT(index);
  galaxyTravel.tTarget = stationT(index);
}

type Frame = { t: number; signs: number; vt: number; phase: 1 | 2; from: number; to: number };

/** The rig's seek loop, headless. `vt` is the virtual position with cut jumps removed. */
function fly(maxSec = 5) {
  const frames: Frame[] = [];
  let vt = galaxyTravel.t;
  let lastSeq = galaxyTravel.warpSeq;
  let lastRaw = galaxyTravel.t;
  for (let i = 0; i < maxSec / DT && galaxyTravel.seek != null; i += 1) {
    now += DT * 1000;
    const from = portalEnvelope(galaxyTravel.portalFrom ?? -1);
    const to = portalEnvelope(galaxyTravel.portalTo ?? -1);
    const s = stepSeek(galaxyTravel.t, DT);
    galaxyTravel.t = s.t;
    const raw = s.t + galaxyTravel.portalSigns * STATION_GAP_T;
    let d = raw - lastRaw;
    if (galaxyTravel.warpSeq !== lastSeq) {
      d -= galaxyTravel.warpT;
      lastSeq = galaxyTravel.warpSeq;
    }
    lastRaw = raw;
    vt += d;
    galaxyTravel.vel = d / DT;
    frames.push({ t: s.t, signs: galaxyTravel.portalSigns, vt, phase: galaxyTravel.portalPhase, from, to });
  }
  galaxyTravel.vel = 0;
  return frames;
}

beforeEach(() => {
  originalNow = performance.now.bind(performance);
  performance.now = () => now;
  parkAt(0);
});

afterEach(() => {
  performance.now = originalNow;
  resetTravel(false);
});

describe("sign steps are the short way around the wheel", () => {
  it("Aries to Pisces is one step", () => {
    assert.equal(signSteps(0, 11), 1);
  });

  it("Aries to Libra is six steps and still takes the portal", () => {
    assert.equal(signSteps(0, 6), 6);
    seekSign(6, { direct: true });
    assert.equal(galaxyTravel.seekKind, "portal");
  });
});

describe("Aries → Pisces is one sign of travel, not eleven", () => {
  it("steps back one sign round the wheel and never visits a sign in between", () => {
    seekSign(11, { direct: true });
    assert.equal(galaxyTravel.seekKind, "portal");
    assert.equal(galaxyTravel.portalDir, -1, "Pisces sits just before Aries on the wheel");
    const frames = fly();
    for (const f of frames) {
      assert.ok(f.t === stationT(0) || f.t === stationT(11), `t visited ${f.t * 11}`);
    }
    assert.equal(galaxyTravel.t, stationT(11));
    assert.equal(galaxyTravel.portalSigns, 0);
    assert.equal(portalActive(), false);
  });

  it("moves like a one-sign glide: continuous, under MAX_FLY, about GLIDE_SEC long", () => {
    seekSign(11, { direct: true });
    const frames = fly();
    let prev = stationT(0);
    let peak = 0;
    for (const f of frames) {
      const v = Math.abs(f.vt - prev) / DT;
      peak = Math.max(peak, v);
      prev = f.vt;
    }
    assert.ok(Math.abs(Math.abs(frames.at(-1)!.vt - stationT(0)) - STATION_GAP_T) < 1e-9, "one sign of virtual travel");
    assert.ok(peak <= MAX_FLY_T * 1.02, `peak ${peak} over cap ${MAX_FLY_T}`);
    const secs = frames.length * DT;
    assert.ok(Math.abs(secs - GLIDE_SEC) < 0.05, `portal took ${secs}s`);
  });

  it("dissolves Aries fully before the cut and raises Pisces from zero after it", () => {
    seekSign(11, { direct: true });
    const frames = fly();
    const cut = frames.findIndex((f) => f.phase === 2);
    assert.ok(cut > 0);
    // Envelopes are sampled at the start of each step; the step that cuts saw camera v ≥ PORTAL_CUT.
    assert.ok(frames[cut]!.from < 0.02, `Aries still at ${frames[cut]!.from} at the cut`);
    assert.ok((frames[cut + 1]?.to ?? 0) < 0.05, "Pisces must not pop in at the cut");
    assert.equal(portalEnvelope(11), 1, "and owns the frame once landed");
  });

  it("Pisces → Aries steps forward one sign", () => {
    parkAt(11);
    seekSign(0, { direct: true });
    assert.equal(galaxyTravel.portalDir, 1);
    fly();
    assert.equal(galaxyTravel.t, stationT(0));
  });

  it("goes the short way round for every far jump", () => {
    assert.equal(portalDirection(0, 11), -1);
    assert.equal(portalDirection(11, 0), 1);
    assert.equal(portalDirection(0, 5), 1);
    assert.equal(portalDirection(5, 0), -1);
    assert.equal(portalDirection(0, 6), 1);
  });

  it("a neighbour stays a plain glide", () => {
    seekSign(1, { direct: true });
    assert.equal(galaxyTravel.seekKind, "direct");
    assert.equal(portalActive(), false);
  });

  it("a strip swipe that moves on before the cut just changes where it lands", () => {
    seekSign(11, { direct: true });
    for (let i = 0; i < 10; i += 1) galaxyTravel.t = stepSeek(galaxyTravel.t, DT).t;
    assert.equal(galaxyTravel.portalPhase, 1);
    seekSign(10, { direct: true });
    assert.equal(galaxyTravel.portalTo, 10);
    fly();
    assert.equal(galaxyTravel.t, stationT(10));
  });

  it("a strip pick while the intro is still finishing takes over from it", () => {
    templeIntro.done = false;
    templeIntro.asking = false;
    templeIntro.t = 6; // chrome (the strip) is already fading in
    seekSign(11, { direct: true });
    assert.equal(templeIntro.done, true, "the pick finishes the opening");
    assert.equal(galaxyTravel.seekKind, "portal");
  });

  it("the hands-off walk never cuts the intro short", () => {
    templeIntro.done = false;
    templeIntro.asking = false;
    templeIntro.t = 6;
    seekSign(1, { auto: true });
    assert.equal(templeIntro.done, false);
    templeIntro.done = true;
  });

  it("Enter pressed mid-portal dives once it lands", () => {
    seekSign(11, { direct: true });
    for (let i = 0; i < 20; i += 1) galaxyTravel.t = stepSeek(galaxyTravel.t, DT).t;
    assert.equal(enterSignGalaxy(), true);
    assert.equal(galaxyTravel.explorePhase, "idle", "not yet — the camera is between frames");
    fly();
    assert.equal(galaxyTravel.explorePhase, "fading");
    assert.equal(galaxyTravel.exploreSignIndex, 11);
  });
});
