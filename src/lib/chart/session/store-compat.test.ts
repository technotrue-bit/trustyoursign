import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";

const loaded = await Promise.all([
  import("./store.ts").catch(() => null),
  import("./compat.ts").catch(() => null),
]);
const storeModule = loaded[0];
const compatModule = loaded[1];

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

function modules() {
  assert.ok(storeModule, "session/store.ts should exist");
  assert.ok(compatModule, "session/compat.ts should exist");
  return { store: storeModule.useSessionStore, compat: compatModule };
}

describe("session store compatibility façade", () => {
  beforeEach(() => {
    if (!storeModule) return;
    storeModule.useSessionStore.setState({
      session: null,
      claim: null,
      surface: "galaxy",
    });
  });

  it("provides the new store and compatibility projector modules", () => {
    const { store, compat } = modules();
    assert.equal(typeof store, "function");
    assert.equal(typeof compat.projectVaultState, "function");
  });

  it("projects default legacy fields from domain state", () => {
    const { store, compat } = modules();
    const projected = compat.projectVaultState(store.getState());
    assert.equal(projected.entered, false);
    assert.equal(projected.gate, "galaxy");
    assert.equal(projected.chartId, null);
    assert.equal(projected.research, null);
    assert.equal(projected.shelf, null);
    assert.equal(projected.chat, false);
    assert.equal(projected.pickedSign, null);
    assert.equal(projected.birth, null);
    assert.equal(projected.mode, "sky");
    assert.equal(projected.selection, null);
    assert.equal(projected.hovered, null);
    assert.equal(projected.tourBeat, null);
    assert.equal(projected.sheetFolded, false);
    assert.equal(projected.skyNatal, null);
  });

  it("validates claim birth and opens a visitor through the legacy API", () => {
    const { store, compat } = modules();
    let vault = compat.projectVaultState(store.getState());

    vault.openBirthChat("leo");
    vault = compat.projectVaultState(store.getState());
    assert.equal(vault.chat, true);
    assert.equal(vault.pickedSign, "leo");

    vault.setBirth({
      year: 2004,
      month: 9,
      day: 1,
      hour: null,
      minute: null,
      place: null,
    });
    assert.equal(compat.projectVaultState(store.getState()).birth, null);

    vault.setBirth({
      year: 2004,
      month: 7,
      day: 26,
      hour: 18,
      minute: 21,
      place: "Port Huron",
    });
    compat.projectVaultState(store.getState()).openVisitor(nativity, sky);

    vault = compat.projectVaultState(store.getState());
    assert.equal(vault.entered, true);
    assert.equal(vault.chat, false);
    assert.equal(vault.chartId, "visitor");
    assert.equal(vault.research, nativity);
    assert.equal(vault.skyNatal, sky);
    assert.equal(vault.pickedSign, "leo");
    assert.equal(vault.birth?.day, 26);
  });

  it("opens a visitor chart from the legacy library entry", () => {
    const { store, compat } = modules();

    compat.projectVaultState(store.getState()).openChart("visitor", nativity);

    const vault = compat.projectVaultState(store.getState());
    assert.equal(vault.gate, "library");
    assert.equal(vault.chartId, "visitor");
  });

  it("opens and projects a shelf without exposing its id as chartId", () => {
    const { store, compat } = modules();
    compat.projectVaultState(store.getState()).openShelf({
      id: "saved-1",
      label: "Sam",
      signId: "virgo",
      birthMonth: 9,
      birthDay: 2,
      birthYear: 1990,
      birthHour: null,
      birthMinute: null,
      birthPlace: null,
      natal: sky,
      tone: "warm",
      relation: "other",
      personName: "Sam",
      from: "library",
    });

    let vault = compat.projectVaultState(store.getState());
    assert.equal(vault.entered, true);
    assert.equal(vault.gate, "library");
    assert.equal(vault.chartId, null);
    assert.equal(vault.shelf?.id, "saved-1");
    assert.equal(vault.shelf?.birthMonth, 9);
    assert.equal(vault.shelf?.natal, sky);
    assert.equal(vault.mode, "ask");

    const warmer = { ...sky, tone: "vault" as const };
    vault.setShelfNatal(warmer);
    vault = compat.projectVaultState(store.getState());
    assert.equal(vault.shelf?.natal, warmer);
    assert.equal(vault.shelf?.tone, "vault");

    vault.setShelfTone("warm");
    vault = compat.projectVaultState(store.getState());
    assert.equal(vault.shelf?.tone, "warm");
    assert.equal(vault.shelf?.natal?.tone, "warm");
  });

  it("preserves research tour, interaction, and close behavior", () => {
    const { store, compat } = modules();
    const research = {
      ...nativity,
      id: "joey",
      meta: { ...nativity.meta, name: "Joey" },
    } as Nativity;

    compat.projectVaultState(store.getState()).openChart("joey", research);
    let vault = compat.projectVaultState(store.getState());
    assert.equal(vault.chartId, "joey");
    assert.equal(vault.gate, "library");
    assert.equal(vault.tourBeat, "body-wells");
    assert.equal(vault.mode, "body");
    assert.deepEqual(vault.selection, { kind: "chakra", id: "heart" });

    vault.hover({ kind: "planet", id: "sun" });
    vault.setMode("ask");
    vault = compat.projectVaultState(store.getState());
    assert.equal(vault.hovered, null);
    assert.deepEqual(vault.selection, { kind: "chakra", id: "heart" });

    vault.nextTour();
    vault = compat.projectVaultState(store.getState());
    assert.equal(vault.tourBeat, "ask-machine");
    assert.equal(vault.mode, "ask");
    assert.deepEqual(vault.selection, { kind: "planet", id: "sun" });

    vault.foldSheet(true);
    assert.equal(compat.projectVaultState(store.getState()).sheetFolded, true);
    compat.projectVaultState(store.getState()).goBack();
    vault = compat.projectVaultState(store.getState());
    assert.equal(vault.entered, false);
    assert.equal(vault.gate, "library");
    assert.equal(vault.sheetFolded, false);

    vault.goBack();
    vault = compat.projectVaultState(store.getState());
    assert.equal(vault.gate, "galaxy");
  });
});
