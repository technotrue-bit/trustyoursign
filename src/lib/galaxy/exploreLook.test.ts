import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { CONSTELLATIONS } from "./constellations.ts";
import { getSignGalaxy } from "./signGalaxy.ts";
import { skipIntro, templeIntro } from "./intro.ts";
import {
  EXPLORE_LOOK_MAX_X,
  EXPLORE_ZOOM_MAX,
  EXPLORE_ZOOM_MIN,
  applyExploreLook,
  applyExploreLookOffset,
  applyFlyDelta,
  applyWheel,
  enterSignGalaxy,
  galaxyTravel,
  pointerTracksHover,
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

  it("touch does not arm hover sway — only mouse does", () => {
    assert.equal(pointerTracksHover("mouse"), true);
    assert.equal(pointerTracksHover("touch"), false);
    assert.equal(pointerTracksHover("pen"), false);
  });

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

  it("galaxies let you travel between stars even if unlock flag is forced off", () => {
    galaxyTravel.starsUnlocked = false;
    applyExploreLook(10, 40, true);
    assert.equal(seekGalaxyPoint(1), true);
    assert.equal(galaxyTravel.pointIndex, 1);
  });

  it("every sign galaxy can look and move", () => {
    for (let i = 0; i < CONSTELLATIONS.length; i++) {
      landInside(i);
      galaxyTravel.starsUnlocked = false;
      const t0 = galaxyTravel.tTarget;
      const name = CONSTELLATIONS[i]!.name;
      assert.equal(applyExploreLook(0, 80, true), true, `${name}: look`);
      assert.equal(galaxyTravel.tTarget, t0, `${name}: corridor t must not cruise`);
      assert.ok(galaxyTravel.exploreLookX < -0.3, `${name}: look X ${galaxyTravel.exploreLookX}`);
      const galaxy = getSignGalaxy(CONSTELLATIONS[i]!.id);
      assert.ok(galaxy.points.length >= 3, `${name}: travel points`);
      assert.equal(seekGalaxyPoint(1), true, `${name}: seek star 1`);
      assert.equal(galaxyTravel.pointIndex, 1, `${name}: landed on star 1`);
      assert.equal(seekGalaxyPoint(0), true, `${name}: return to hub`);
      assert.equal(galaxyTravel.pointIndex, 0, `${name}: hub`);
    }
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

  it("seek from a look-offset frames the travel point", () => {
    applyExploreLook(20, 140, true);
    assert.ok(Math.abs(galaxyTravel.exploreLookX) > 0.4, "precondition: look offset");
    assert.ok(Math.abs(galaxyTravel.exploreLookY) > 0.05, "precondition: look Y");
    galaxyTravel.zoomTarget = 0.9;
    const zoomBefore = galaxyTravel.zoomTarget;

    assert.equal(seekGalaxyPoint(1), true);
    assert.equal(galaxyTravel.pointIndex, 1);
    assert.equal(galaxyTravel.exploreLookX, 0, "seek resets look X so the star is framed");
    assert.equal(galaxyTravel.exploreLookY, 0, "seek resets look Y so the star is framed");
    assert.ok(
      galaxyTravel.zoomTarget > zoomBefore,
      `seek should nudge zoom toward framing (~1.12), got ${galaxyTravel.zoomTarget} from ${zoomBefore}`,
    );
    assert.ok(
      galaxyTravel.zoomTarget >= EXPLORE_ZOOM_MIN && galaxyTravel.zoomTarget <= EXPLORE_ZOOM_MAX,
      `framed zoom stays in inside clamp, got ${galaxyTravel.zoomTarget}`,
    );
    // 0.9 + (1.12 - 0.9) * 0.45 ≈ 0.999 — soft ease toward SEEK_FRAME_ZOOM
    assert.ok(
      Math.abs(galaxyTravel.zoomTarget - (0.9 + (1.12 - 0.9) * 0.45)) < 1e-9,
      `expected soft frame blend, got ${galaxyTravel.zoomTarget}`,
    );
  });

  it("wheel inside changes zoomTarget and can pull back below 1", () => {
    assert.ok(EXPLORE_ZOOM_MIN < 1, "inside min must allow pull-back below 1");
    galaxyTravel.zoomTarget = 1;
    const atOne = galaxyTravel.zoomTarget;

    applyWheel(-400);
    assert.ok(
      galaxyTravel.zoomTarget > atOne,
      `scroll up should zoom in, got ${galaxyTravel.zoomTarget}`,
    );
    assert.ok(galaxyTravel.zoomTarget <= EXPLORE_ZOOM_MAX);

    galaxyTravel.zoomTarget = 1;
    applyWheel(500);
    assert.ok(
      galaxyTravel.zoomTarget < 1,
      `scroll down should pull back below 1, got ${galaxyTravel.zoomTarget}`,
    );
    assert.ok(galaxyTravel.zoomTarget >= EXPLORE_ZOOM_MIN);

    galaxyTravel.zoomTarget = EXPLORE_ZOOM_MIN;
    applyWheel(800);
    assert.equal(
      galaxyTravel.zoomTarget,
      EXPLORE_ZOOM_MIN,
      "pull-back clamps at EXPLORE_ZOOM_MIN",
    );

    galaxyTravel.zoomTarget = EXPLORE_ZOOM_MAX;
    applyWheel(-800);
    assert.equal(
      galaxyTravel.zoomTarget,
      EXPLORE_ZOOM_MAX,
      "push-in clamps at EXPLORE_ZOOM_MAX",
    );
  });
});
