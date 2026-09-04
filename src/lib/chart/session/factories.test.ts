import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Nativity } from "@/lib/chart/schema";
import type { SkyNatal } from "@/lib/chart/ephemeris";
import {
  fromResearch,
  fromShelf,
  fromVisitor,
  newSessionId,
  visitorBirth,
  visitorSign,
} from "./factories.ts";

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
