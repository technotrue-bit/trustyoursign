import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { Nativity } from "@/lib/chart/schema";
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
    assert.equal(useSessionStore.getState().claim?.birth, null);

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

  it("opens a visitor from the library", () => {
    useSessionStore.getState().openLibraryVisitor(nativity);

    const state = useSessionStore.getState();
    assert.equal(state.session?.origin, "library");
    assert.equal(state.session?.kind, "visitor");
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
