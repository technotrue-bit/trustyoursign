import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { skipIntro, templeIntro } from "./intro.ts";
import {
  EXPLORE_LOOK_MAX_X,
  applyExploreLook,
  applyExploreLookOffset,
  applyFlyDelta,
  enterSignGalaxy,
  galaxyTravel,
  resetExplore,
  resetTravel,
  seekGalaxyPoint,
  setExploreLookHold,
  skipEnterGalaxy,
  stepExplore,
} from "./travel.ts";

function landInside(index = 4) {
  templeIntro.t = Math.max(templeIntro.t, 0.4);
  skipIntro();
  resetTravel(false);
  galaxyTravel.birth = 1;
  galaxyTravel.busy = false;
  resetExplore(true);
  assert.equal(enterSignGalaxy(index), true);
  assert.equal(skipEnterGalaxy(), true);
  stepExplore(0.5);
  stepExplore(0.25);
  stepExplore(0.6);
  assert.equal(galaxyTravel.explorePhase, "inside");
  assert.equal(galaxyTravel.enterSkip, "idle");
}

describe("explore look inside a locked galaxy", () => {
  beforeEach(() => landInside(4));

  it("drag pans look and does not change corridor t", () => {
    const t0 = galaxyTravel.tTarget;
    const ok = applyExploreLook(0, 120, true);
    assert.equal(ok, true);
    assert.equal(galaxyTravel.tTarget, t0);
    assert.ok(
      galaxyTravel.exploreLookX < -0.5,
      `drag right should look left (grab-the-sky), got ${galaxyTravel.exploreLookX}`,
    );
    assert.ok(Math.abs(galaxyTravel.exploreLookY) < 0.05);
  });

  it("applyFlyDelta inside does not cruise the corridor", () => {
    const t0 = galaxyTravel.tTarget;
    applyFlyDelta(80, 0, true);
    assert.equal(galaxyTravel.tTarget, t0);
    assert.ok(galaxyTravel.exploreLookY > 0.5, `drag down should look up, got ${galaxyTravel.exploreLookY}`);
  });

  it("enter dive still ignores drag", () => {
    resetTravel(false);
    galaxyTravel.birth = 1;
    galaxyTravel.busy = false;
    assert.equal(enterSignGalaxy(4), true);
    assert.equal(galaxyTravel.explorePhase, "fading");
    const t0 = galaxyTravel.tTarget;
    applyFlyDelta(40, 80, true);
    assert.equal(galaxyTravel.exploreLookX, 0);
    assert.equal(galaxyTravel.exploreLookY, 0);
    assert.equal(galaxyTravel.tTarget, t0);
  });

  it("sealed stars stay unseekable while looking", () => {
    galaxyTravel.starsUnlocked = false;
    applyExploreLook(10, 40, true);
    assert.equal(seekGalaxyPoint(1), false);
    assert.equal(galaxyTravel.pointIndex, 0);
  });

  it("A looks left and D looks right", () => {
    setExploreLookHold(-1, 0);
    stepExplore(0.4);
    assert.ok(galaxyTravel.exploreLookX < -1, `A should look left, got ${galaxyTravel.exploreLookX}`);
    const afterA = galaxyTravel.exploreLookX;
    setExploreLookHold(1, 0);
    stepExplore(0.8);
    assert.ok(galaxyTravel.exploreLookX > afterA, "D should look right of where A left the camera");
  });

  it("look clamps to the galaxy frame", () => {
    applyExploreLookOffset(-100, 0);
    assert.equal(galaxyTravel.exploreLookX, -EXPLORE_LOOK_MAX_X);
  });
});
