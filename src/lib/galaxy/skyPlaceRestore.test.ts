import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { CONSTELLATIONS } from "./constellations.ts";
import { resetIntroForTests, skipIntro, templeIntro } from "./intro.ts";
import { useGalaxy } from "./store.ts";
import {
  exploringSign,
  galaxyTravel,
  insideSignGalaxy,
  resetTravel,
  restoreInsideSignGalaxy,
  returnToOpenSky,
  snapToSign,
} from "./travel.ts";

function resetWorld() {
  resetIntroForTests();
  templeIntro.done = true;
  templeIntro.booted = true;
  resetTravel(false);
  useGalaxy.setState({
    born: true,
    moved: false,
    t: 0,
    signIndex: 0,
    explore: {
      phase: "idle",
      signIndex: null,
      progress: 0,
      skipPhase: "idle",
      skipVeil: 0,
      worldFade: 1,
      plateFade: 1,
      galaxyForm: 0,
      pointIndex: 0,
    },
  });
}

afterEach(() => {
  resetWorld();
});

describe("snapToSign / restoreInsideSignGalaxy", () => {
  it("snaps the corridor onto a sign station", () => {
    resetWorld();
    assert.equal(snapToSign(4), true);
    assert.equal(galaxyTravel.moved, true);
    assert.equal(useGalaxy.getState().signIndex, 4);
    assert.equal(useGalaxy.getState().moved, true);
    assert.equal(exploringSign(), false);
  });

  it("lands inside a sign galaxy without the enter dive", () => {
    resetWorld();
    skipIntro();
    assert.equal(restoreInsideSignGalaxy(0, 0), true);
    assert.equal(insideSignGalaxy(), true);
    assert.equal(galaxyTravel.exploreSignIndex, 0);
    assert.equal(galaxyTravel.pointIndex, 0);
    assert.equal(useGalaxy.getState().explore.phase, "inside");
    assert.equal(useGalaxy.getState().explore.signIndex, 0);
    assert.equal(CONSTELLATIONS[0]?.id, "aries");
  });

  it("returnToOpenSky clears an inside visit back to the title", () => {
    resetWorld();
    assert.equal(restoreInsideSignGalaxy(4, 1), true);
    returnToOpenSky();
    assert.equal(exploringSign(), false);
    assert.equal(useGalaxy.getState().moved, false);
    assert.equal(useGalaxy.getState().explore.phase, "idle");
    assert.equal(useGalaxy.getState().born, true);
    assert.equal(useGalaxy.getState().introDone, true);
  });

  it("restores a deeper star index", () => {
    resetWorld();
    assert.equal(restoreInsideSignGalaxy(0, 3), true);
    assert.equal(insideSignGalaxy(), true);
    assert.equal(galaxyTravel.pointIndex, 3);
    assert.equal(useGalaxy.getState().explore.pointIndex, 3);
  });
});
