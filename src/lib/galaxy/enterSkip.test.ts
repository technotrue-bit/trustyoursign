import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  enterSignGalaxy,
  skipEnterGalaxy,
  stepExplore,
  galaxyTravel,
  resetExplore,
  resetTravel,
} from "./travel.ts";
import { skipIntro, templeIntro } from "./intro.ts";

describe("enterSkip soft blackout", () => {
  beforeEach(() => {
    templeIntro.t = Math.max(templeIntro.t, 0.4);
    skipIntro();
    resetTravel(false);
    galaxyTravel.birth = 1;
    resetExplore(true);
  });

  it("skipEnterGalaxy starts out and ignores spam", () => {
    assert.equal(enterSignGalaxy(0), true);
    assert.equal(galaxyTravel.explorePhase, "fading");
    assert.equal(skipEnterGalaxy(), true);
    assert.equal(galaxyTravel.enterSkip, "out");
    assert.equal(skipEnterGalaxy(), false);
    assert.equal(galaxyTravel.enterSkip, "out");
  });

  it("out → hold lands under veil at p=1 inside; then in → idle", () => {
    assert.equal(enterSignGalaxy(0), true);
    assert.equal(skipEnterGalaxy(), true);
    // Drain out
    stepExplore(0.5);
    assert.equal(galaxyTravel.enterSkip, "hold");
    assert.equal(galaxyTravel.explorePhase, "inside");
    assert.equal(galaxyTravel.exploreProgress, 1);
    assert.ok(galaxyTravel.skipVeil > 0.95);
    // Drain hold
    stepExplore(0.25);
    assert.equal(galaxyTravel.enterSkip, "in");
    // Drain in
    stepExplore(0.6);
    assert.equal(galaxyTravel.enterSkip, "idle");
    assert.ok(galaxyTravel.skipVeil < 0.05);
    assert.equal(galaxyTravel.explorePhase, "inside");
  });

  it("normal stepExplore does not raise skipVeil", () => {
    assert.equal(enterSignGalaxy(0), true);
    stepExplore(0.2);
    assert.equal(galaxyTravel.enterSkip, "idle");
    assert.ok(galaxyTravel.skipVeil < 0.01);
  });
});
