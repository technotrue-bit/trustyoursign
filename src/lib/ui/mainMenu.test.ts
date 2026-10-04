import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Nativity } from "@/lib/chart/schema";
import { fromResearch } from "@/lib/chart/session/factories";
import { useSessionStore } from "@/lib/chart/session/store";
import { resetIntroForTests } from "@/lib/galaxy/intro";
import { useGalaxy } from "@/lib/galaxy/store";
import { exploringSign, resetExplore, resetTravel, restoreInsideSignGalaxy } from "@/lib/galaxy/travel";
import { leaveToMainMenu } from "./mainMenu.ts";

const nativity = {
  id: "joey",
  meta: { name: "Joey Devin Norris", date: "26 July 2004", place: "Port Huron" },
  planets: [{ id: "sun", lon: 124 }],
} as Nativity;

function resetWorld() {
  resetIntroForTests();
  resetTravel(false);
  resetExplore(true);
  useSessionStore.setState({ session: null, claim: null, surface: "galaxy" });
  useGalaxy.setState({
    born: true,
    moved: false,
    t: 0,
    signIndex: 0,
    introDone: false,
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

describe("leaveToMainMenu", () => {
  it("drops a research natal and lands on the title sky", () => {
    resetWorld();
    const session = fromResearch({ chartKey: "joey", nativity });
    useSessionStore.setState({ session, claim: null, surface: "library" });
    useGalaxy.setState({ moved: true, born: true, signIndex: 4 });

    leaveToMainMenu();

    const st = useSessionStore.getState();
    assert.equal(st.session, null);
    assert.equal(st.claim, null);
    assert.equal(st.surface, "galaxy");
    assert.equal(useGalaxy.getState().moved, false);
    assert.equal(useGalaxy.getState().born, true);
    assert.equal(useGalaxy.getState().introDone, true);
    assert.equal(exploringSign(), false);
  });

  it("steps off the library desk when no chart is open", () => {
    resetWorld();
    useSessionStore.setState({ session: null, claim: null, surface: "library" });
    useGalaxy.setState({ moved: true, signIndex: 3 });

    leaveToMainMenu();

    assert.equal(useSessionStore.getState().surface, "galaxy");
    assert.equal(useSessionStore.getState().session, null);
    assert.equal(useGalaxy.getState().moved, false);
  });

  it("drops a natal that was opened over a sign galaxy", () => {
    resetWorld();
    assert.equal(restoreInsideSignGalaxy(2, 0), true);
    const session = fromResearch({ chartKey: "joey", nativity });
    useSessionStore.setState({ session, claim: null, surface: "library" });

    leaveToMainMenu();

    assert.equal(useSessionStore.getState().session, null);
    assert.equal(useSessionStore.getState().surface, "galaxy");
    assert.equal(exploringSign(), false);
    assert.equal(useGalaxy.getState().moved, false);
    assert.equal(useGalaxy.getState().explore.phase, "idle");
  });

  it("leaves an open sign galaxy for the title", () => {
    resetWorld();
    assert.equal(restoreInsideSignGalaxy(4, 1), true);
    assert.equal(exploringSign(), true);

    leaveToMainMenu();

    assert.equal(exploringSign(), false);
    assert.equal(useGalaxy.getState().moved, false);
    assert.equal(useGalaxy.getState().explore.phase, "idle");
    assert.equal(useSessionStore.getState().surface, "galaxy");
  });
});
