import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { Nativity } from "@/lib/chart/schema";
import { useGalaxy } from "@/lib/galaxy/store";
import {
  OPEN_T,
  enterSignGalaxy,
  exploringSign,
  galaxyTravel,
  resetExplore,
  resetTravel,
  stepExplore,
} from "@/lib/galaxy/travel";
import { skipIntro, templeIntro } from "@/lib/galaxy/intro";
import { useSessionStore } from "./store.ts";

const nativity = {
  id: "visitor",
  meta: {
    name: "Visitor",
    date: "26 July 2004",
    time: "6:21 PM",
    place: "Port Huron",
  },
  planets: [{ id: "sun", lon: 124 }],
} as Nativity;

const sky = {
  depth: "vault",
  tone: "vault",
  when: "26 July 2004 · 6:21 PM",
  place: "Port Huron",
  bodies: [],
} as unknown as SkyNatal;

describe("session store", () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      claim: null,
      surface: "galaxy",
    });
    useGalaxy.setState({ born: false, moved: false, t: OPEN_T, signIndex: 0 });
  });

  it("starts with domain state only", () => {
    const state = useSessionStore.getState();
    assert.equal(state.session, null);
    assert.equal(state.claim, null);
    assert.equal(state.surface, "galaxy");
  });

  it("validates claim birth and opens a visitor", () => {
    let state = useSessionStore.getState();
    state.openClaim("leo");

    state = useSessionStore.getState();
    assert.equal(state.claim?.signId, "leo");

    state.setClaimBirth({
      year: 2004,
      month: 9,
      day: 1,
      hour: null,
      minute: null,
      place: null,
    });
    // Cusp dates are now accepted — the sun sign is resolved from the date, not the claim.
    assert.deepEqual(useSessionStore.getState().claim?.birth, {
      year: 2004,
      month: 9,
      day: 1,
      hour: null,
      minute: null,
      place: null,
    });

    state.setClaimBirth({
      year: 2004,
      month: 7,
      day: 26,
      hour: 18,
      minute: 21,
      place: "Port Huron",
    });
    useSessionStore.getState().openVisitor(nativity, sky);

    state = useSessionStore.getState();
    assert.equal(state.claim, null);
    assert.equal(state.session?.kind, "visitor");
    assert.equal(state.session?.nativity, nativity);
    assert.equal(state.session?.skyNatal, sky);
    assert.equal(state.session?.signId, "leo");
    assert.equal(state.session?.birth.day, 26);
  });

  it("restores open-galaxy travel when closing a galaxy visitor", () => {
    useGalaxy.setState({ born: false, moved: true, t: 0.72, signIndex: 8 });
    useSessionStore.getState().openVisitor(nativity, sky);
    useSessionStore.getState().close();

    const galaxy = useGalaxy.getState();
    assert.deepEqual(
      {
        born: galaxy.born,
        moved: galaxy.moved,
        t: galaxy.t,
        signIndex: galaxy.signIndex,
      },
      { born: true, moved: false, t: OPEN_T, signIndex: 0 },
    );
  });

  it("leaves galaxy travel untouched when closing research", () => {
    useGalaxy.setState({ born: true, moved: true, t: 0.43, signIndex: 5 });
    const before = useGalaxy.getState();
    useSessionStore.getState().openResearch("saige", {
      ...nativity,
      id: "saige",
    } as Nativity);
    useSessionStore.getState().close();

    assert.equal(useGalaxy.getState(), before);
  });

  it("opens and patches a shelf session", () => {
    useSessionStore.getState().openShelf({
      id: "saved-1",
      label: "Sam",
      signId: "virgo",
      birth: {
        month: 9,
        day: 2,
        year: 1990,
        hour: null,
        minute: null,
        place: null,
      },
      skyNatal: sky,
      tone: "warm",
      relation: "other",
      personName: "Sam",
      origin: "library",
      fromSavedId: "saved-1",
    });

    let session = useSessionStore.getState().session;
    assert.equal(session?.kind, "shelf");
    assert.equal(session?.origin, "library");
    assert.equal(session?.savedId, "saved-1");
    assert.equal(session?.birth.month, 9);
    assert.equal(session?.skyNatal, sky);
    assert.equal(session?.mode, "ask");

    const warmer = { ...sky, tone: "vault" as const };
    useSessionStore.getState().setShelfNatal(warmer);
    session = useSessionStore.getState().session;
    assert.equal(session?.skyNatal, warmer);
    assert.equal(session?.tone, "vault");

    useSessionStore.getState().setShelfTone("warm");
    session = useSessionStore.getState().session;
    assert.equal(session?.tone, "warm");
    assert.equal(session?.skyNatal?.tone, "warm");
  });

  it("attachSavedId sets savedId on the open session", () => {
    useSessionStore.getState().openVisitor(nativity, sky);
    useSessionStore.getState().attachSavedId("33333333-3333-3333-3333-333333333333");
    assert.equal(useSessionStore.getState().session?.savedId, "33333333-3333-3333-3333-333333333333");
  });

  it("attachSavedId is a no-op for research sessions", () => {
    useSessionStore.getState().openResearch("saige", {
      ...nativity,
      id: "saige",
    } as Nativity);
    const before = useSessionStore.getState().session;
    assert.equal(before?.kind, "research");
    assert.equal(before?.savedId, undefined);

    useSessionStore.getState().attachSavedId("44444444-4444-4444-4444-444444444444");

    const after = useSessionStore.getState().session;
    assert.equal(after, before);
    assert.equal(after?.savedId, undefined);
    assert.equal(after?.chartKey, "saige");
    assert.equal(after?.id, before?.id);
  });

  it("attachSavedId sets savedId and chartKey on shelf sessions", () => {
    useSessionStore.getState().openShelf({
      label: "Sam",
      signId: "virgo",
      birth: {
        month: 9,
        day: 2,
        year: 1990,
        hour: null,
        minute: null,
        place: null,
      },
      skyNatal: sky,
      origin: "library",
    });

    const uuid = "55555555-5555-5555-5555-555555555555";
    useSessionStore.getState().attachSavedId(uuid);

    const session = useSessionStore.getState().session;
    assert.equal(session?.kind, "shelf");
    assert.equal(session?.savedId, uuid);
    assert.equal(session?.chartKey, uuid);
  });

  it("preserves research tour, interaction, and close behavior", () => {
    const research = {
      ...nativity,
      id: "joey",
      meta: { ...nativity.meta, name: "Joey" },
    } as Nativity;

    useSessionStore.getState().openResearch("joey", research);
    let state = useSessionStore.getState();
    assert.equal(state.session?.kind, "research");
    assert.equal(state.session?.chartKey, "joey");
    assert.equal(state.session?.origin, "library");
    assert.equal(state.session?.tourBeat, "body-wells");
    assert.equal(state.session?.mode, "body");
    assert.deepEqual(state.session?.selection, { kind: "chakra", id: "heart" });

    state.hover({ kind: "planet", id: "sun" });
    state.setMode("ask");
    state = useSessionStore.getState();
    assert.equal(state.session?.hovered, null);
    assert.deepEqual(state.session?.selection, { kind: "chakra", id: "heart" });

    state.nextTour();
    state = useSessionStore.getState();
    assert.equal(state.session?.tourBeat, "ask-machine");
    assert.equal(state.session?.mode, "ask");
    assert.deepEqual(state.session?.selection, { kind: "planet", id: "sun" });

    state.foldSheet(true);
    assert.equal(useSessionStore.getState().session?.sheetFolded, true);
    useSessionStore.getState().close();
    state = useSessionStore.getState();
    assert.equal(state.session, null);
    assert.equal(state.surface, "library");

    state.close();
    state = useSessionStore.getState();
    assert.equal(state.surface, "galaxy");
  });
});

describe("backing out of a sign galaxy", () => {
  beforeEach(() => {
    templeIntro.t = Math.max(templeIntro.t, 0.4);
    skipIntro();
    resetTravel(false);
    galaxyTravel.birth = 1;
    resetExplore(true);
    useGalaxy.setState({ born: true, moved: true, t: OPEN_T, signIndex: 4 });
    useSessionStore.setState({ session: null, claim: null, surface: "galaxy" });
  });

  it("leaves the dive unwinding instead of snapping the corridor home", () => {
    assert.equal(enterSignGalaxy(4), true);
    for (let i = 0; i < 400 && galaxyTravel.explorePhase !== "inside"; i += 1) {
      stepExplore(1 / 60);
    }
    assert.equal(galaxyTravel.explorePhase, "inside");
    const tBefore = useGalaxy.getState().t;
    const indexBefore = useGalaxy.getState().signIndex;

    // The case the old code reset on: nothing open but the library surface, so
    // close() reached for resetGalaxyTravel() while the dive was still winding.
    useSessionStore.setState({ surface: "library" });
    useSessionStore.getState().close();

    assert.equal(
      galaxyTravel.explorePhase,
      "exiting",
      "close() must start the exit and let it run, not abort it in the same tick",
    );
    assert.equal(useGalaxy.getState().moved, true, "the corridor must not be reset home");
    assert.equal(useGalaxy.getState().signIndex, indexBefore);
    assert.equal(useGalaxy.getState().t, tBefore);
  });

  it("still resets the corridor when no sign galaxy is open", () => {
    assert.equal(exploringSign(), false);
    useSessionStore.setState({ surface: "library", session: null, claim: null });
    useSessionStore.getState().close();
    assert.equal(useGalaxy.getState().moved, false);
    assert.equal(useGalaxy.getState().t, OPEN_T);
    assert.equal(useGalaxy.getState().signIndex, 0);
  });
});
