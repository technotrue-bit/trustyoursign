import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { templeIntro } from "./intro.ts";
import { useGalaxy } from "./store.ts";
import {
  SELECTION_HOLD_MS,
  armSelectionHold,
  clearSignSelection,
  galaxyTravel,
  resetTravel,
  seekSign,
  stepSelectionHold,
} from "./travel.ts";

describe("selection hold", () => {
  let now = 1_000;
  let originalNow: () => number;

  beforeEach(() => {
    originalNow = performance.now.bind(performance);
    now = 1_000;
    performance.now = () => now;
    resetTravel(false);
    galaxyTravel.birth = 1;
    galaxyTravel.busy = false;
    galaxyTravel.claiming = false;
    templeIntro.done = true;
    templeIntro.asking = false;
    useGalaxy.setState({
      moved: false,
      signIndex: 0,
      t: 0,
      introDone: true,
      introVeil: 0,
    });
  });

  afterEach(() => {
    performance.now = originalNow;
  });

  it("arms a 10s countdown when seeking a sign", () => {
    seekSign(4, { direct: true });
    assert.equal(galaxyTravel.moved, true);
    assert.equal(galaxyTravel.selectionHoldLeft, SELECTION_HOLD_MS);
  });

  it("counts down and clears selection at zero", () => {
    armSelectionHold();
    galaxyTravel.moved = true;
    useGalaxy.setState({ moved: true });

    now = 1_000 + 4_000;
    stepSelectionHold();
    assert.equal(galaxyTravel.selectionHoldLeft, SELECTION_HOLD_MS - 4_000);
    assert.equal(galaxyTravel.moved, true);

    now = 1_000 + SELECTION_HOLD_MS;
    stepSelectionHold();
    assert.equal(galaxyTravel.moved, false);
    assert.equal(galaxyTravel.selectionHoldLeft, null);
    assert.equal(useGalaxy.getState().moved, false);
  });

  it("pauses while claiming even if busy is false", () => {
    armSelectionHold();
    galaxyTravel.moved = true;
    galaxyTravel.busy = false;
    galaxyTravel.claiming = true;

    now = 1_000 + 5_000;
    stepSelectionHold();
    assert.equal(galaxyTravel.selectionHoldLeft, SELECTION_HOLD_MS);

    galaxyTravel.claiming = false;
    now = 1_000 + 8_000;
    stepSelectionHold();
    assert.equal(galaxyTravel.selectionHoldLeft, SELECTION_HOLD_MS - 3_000);
  });

  it("pauses while busy and resumes afterward", () => {
    armSelectionHold();
    galaxyTravel.moved = true;
    galaxyTravel.busy = true;

    now = 1_000 + 5_000;
    stepSelectionHold();
    assert.equal(galaxyTravel.selectionHoldLeft, SELECTION_HOLD_MS);

    galaxyTravel.busy = false;
    now = 1_000 + 8_000;
    stepSelectionHold();
    assert.equal(galaxyTravel.selectionHoldLeft, SELECTION_HOLD_MS - 3_000);
  });

  it("clearSignSelection drops highlight and timer", () => {
    seekSign(2);
    clearSignSelection();
    assert.equal(galaxyTravel.moved, false);
    assert.equal(galaxyTravel.selectionHoldLeft, null);
  });

  it("auto seek does not arm a selection hold", () => {
    seekSign(3, { auto: true });
    assert.equal(galaxyTravel.moved, false);
    assert.equal(galaxyTravel.selectionHoldLeft, null);
  });
});
