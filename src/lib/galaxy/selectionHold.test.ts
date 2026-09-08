import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { templeIntro } from "./intro";
import { useGalaxy } from "./store";
import {
  SELECTION_HOLD_MS,
  armSelectionHold,
  clearSignSelection,
  galaxyTravel,
  resetTravel,
  seekSign,
  stepSelectionHold,
} from "./travel";

describe("selection hold", () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetTravel(false);
    galaxyTravel.birth = 1;
    galaxyTravel.busy = false;
    templeIntro.done = true;
    templeIntro.asking = false;
    useGalaxy.setState({
      moved: false,
      signIndex: 0,
      t: 0,
      introDone: true,
      introVeil: 0,
    });
    nowSpy = vi.spyOn(performance, "now").mockReturnValue(1_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("arms a 10s countdown when seeking a sign", () => {
    seekSign(4, { direct: true });
    expect(galaxyTravel.moved).toBe(true);
    expect(galaxyTravel.selectionHoldLeft).toBe(SELECTION_HOLD_MS);
  });

  it("counts down and clears selection at zero", () => {
    armSelectionHold();
    galaxyTravel.moved = true;
    useGalaxy.setState({ moved: true });

    nowSpy.mockReturnValue(1_000 + 4_000);
    stepSelectionHold();
    expect(galaxyTravel.selectionHoldLeft).toBe(SELECTION_HOLD_MS - 4_000);
    expect(galaxyTravel.moved).toBe(true);

    nowSpy.mockReturnValue(1_000 + SELECTION_HOLD_MS);
    stepSelectionHold();
    expect(galaxyTravel.moved).toBe(false);
    expect(galaxyTravel.selectionHoldLeft).toBeNull();
    expect(useGalaxy.getState().moved).toBe(false);
  });

  it("pauses while busy and resumes afterward", () => {
    armSelectionHold();
    galaxyTravel.moved = true;
    galaxyTravel.busy = true;

    nowSpy.mockReturnValue(1_000 + 5_000);
    stepSelectionHold();
    expect(galaxyTravel.selectionHoldLeft).toBe(SELECTION_HOLD_MS);

    galaxyTravel.busy = false;
    nowSpy.mockReturnValue(1_000 + 8_000);
    stepSelectionHold();
    expect(galaxyTravel.selectionHoldLeft).toBe(SELECTION_HOLD_MS - 3_000);
  });

  it("clearSignSelection drops highlight and timer", () => {
    seekSign(2);
    clearSignSelection();
    expect(galaxyTravel.moved).toBe(false);
    expect(galaxyTravel.selectionHoldLeft).toBeNull();
  });
});
