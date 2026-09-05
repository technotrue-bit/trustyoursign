import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { SavedChart } from "@/lib/charts.ts";
import {
  fromResearch,
  fromSavedChart,
  fromShelf,
  fromVisitor,
  newSessionId,
  visitorBirth,
  visitorSign,
} from "./factories.ts";
import { canEnter } from "./rooms.ts";

const birth = {
  year: 2004,
  month: 7,
  day: 26,
  hour: 18,
  minute: 21,
  place: "Port Huron",
};

const sky = {
  depth: "vault",
  tone: "vault",
  when: "26 Jul 2004",
  place: "Port Huron",
  lat: 1,
  lon: 2,
  timeZone: "America/Detroit",
  bodies: [],
  writtenAt: null,
} as SkyNatal;

const nat = { id: "visitor", meta: { name: "Test" } } as Nativity;

const savedShelf: SavedChart = {
  id: "22222222-2222-2222-2222-222222222222",
  label: "Shelf",
  relation: "self",
  personName: null,
  signId: "aries",
  birthMonth: 4,
  birthDay: 10,
  birthYear: 2000,
  birthHour: null,
  birthMinute: null,
  birthPlace: null,
  natal: null,
  tone: "vault",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("session factories", () => {
  it("fromVisitor builds kind visitor with required nativity", () => {
    const s = fromVisitor({
      nativity: nat,
      skyNatal: sky,
      birth,
      signId: "leo",
      origin: "galaxy",
      label: "My natal",
    });
    assert.equal(s.kind, "visitor");
    assert.equal(s.chartKey, "visitor");
    assert.equal(s.nativity?.id, "visitor");
    assert.equal(s.mode, "sky");
    assert.equal(s.origin, "galaxy");
    assert.equal(s.tourBeat, null);
    assert.ok(s.id.length > 0);
  });

  it("fromResearch starts Joey tour beat when provided", () => {
    const book = { id: "joey", meta: { name: "Joey" } } as Nativity;
    const s = fromResearch({
      chartKey: "joey",
      nativity: book,
      tourBeat: "body-wells",
      mode: "body",
      selection: { kind: "chakra", id: "heart" },
      origin: "library",
    });
    assert.equal(s.kind, "research");
    assert.equal(s.chartKey, "joey");
    assert.equal(s.skyNatal, null);
    assert.equal(s.tourBeat, "body-wells");
    assert.equal(s.mode, "body");
    assert.equal(s.signId, "aries");
  });

  it("fromResearch derives birth and sign when research metadata supplies them", () => {
    const book = {
      id: "saige",
      meta: {
        name: "Saige",
        date: "2 September 1990",
        time: "9:05 AM",
        place: "Detroit",
      },
      planets: [],
    } as unknown as Nativity;
    const s = fromResearch({ chartKey: "saige", nativity: book });

    assert.equal(s.birth.year, 1990);
    assert.equal(s.birth.month, 9);
    assert.equal(s.birth.day, 2);
    assert.equal(s.signId, "virgo");
  });

  it("fromVisitor coerces illegal mode to sky", () => {
    const s = fromVisitor({
      nativity: nat,
      skyNatal: sky,
      birth,
      signId: "leo",
      origin: "galaxy",
      mode: "gates",
    });
    assert.equal(s.mode, "sky");
    assert.equal(canEnter(s.kind, s.mode), true);
  });

  it("fromResearch preserves legal mode", () => {
    const book = { id: "joey", meta: { name: "Joey" } } as Nativity;
    const s = fromResearch({
      chartKey: "joey",
      nativity: book,
      mode: "gates",
    });
    assert.equal(s.mode, "gates");
    assert.equal(canEnter(s.kind, s.mode), true);
  });

  it("fromShelf coerces illegal mode to ask", () => {
    const s = fromShelf({
      signId: "virgo",
      birth,
      skyNatal: sky,
      label: "Sam",
      origin: "library",
      mode: "body",
    });
    assert.equal(s.mode, "ask");
    assert.equal(canEnter(s.kind, s.mode), true);
  });

  it("fromShelf allows null nativity and defaults mode ask", () => {
    const s = fromShelf({
      id: "saved-1",
      signId: "virgo",
      birth: { ...birth, hour: null, minute: null, place: null },
      skyNatal: sky,
      nativity: null,
      tone: "warm",
      relation: "other",
      personName: "Sam",
      label: "Sam",
      origin: "library",
      fromSavedId: "saved-1",
    });
    assert.equal(s.kind, "shelf");
    assert.equal(s.nativity, null);
    assert.equal(s.mode, "ask");
    assert.equal(s.savedId, "saved-1");
    assert.equal(s.chartKey, "saved-1");
  });

  it("newSessionId returns a string", () => {
    assert.equal(typeof newSessionId(), "string");
    assert.ok(newSessionId().length > 4);
  });

  it("fromSavedChart opens shelf when timed natal is missing", () => {
    const s = fromSavedChart({ chart: savedShelf, origin: "library" });
    assert.equal(s.kind, "shelf");
    assert.equal(s.savedId, savedShelf.id);
    assert.equal(s.origin, "library");
  });

  it("fromSavedChart opens visitor when nativity + sky provided", () => {
    const s = fromSavedChart({
      chart: {
        ...savedShelf,
        birthHour: 8,
        birthMinute: 15,
        birthPlace: "Paris",
        natal: { tone: "warm" } as SavedChart["natal"],
      },
      origin: "library",
      nativity: nat,
      skyNatal: sky,
    });
    assert.equal(s.kind, "visitor");
    assert.equal(s.savedId, savedShelf.id);
  });

  it("derives visitor birth facts and sign from nativity metadata", () => {
    const visitor = {
      id: "visitor",
      meta: {
        name: "Visitor",
        date: "26 July 2004",
        time: "6:21 PM",
        place: "Port Huron",
      },
      planets: [{ id: "sun", lon: 124 }],
    } as Nativity;

    const facts = visitorBirth(visitor);
    assert.deepEqual(facts, {
      year: 2004,
      month: 7,
      day: 26,
      hour: 18,
      minute: 21,
      place: "Port Huron",
    });
    assert.equal(visitorSign(visitor, facts), "leo");
  });
});
