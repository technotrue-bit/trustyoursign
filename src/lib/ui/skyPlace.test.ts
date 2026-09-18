import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseSkyPlaceSearch,
  placeFromLiveState,
  placeFromSearch,
  placesEqual,
  resolveBootPlace,
  searchFromPlace,
  type SkyPlace,
  type SkyPlaceSearch,
} from "./skyPlace.ts";

describe("parseSkyPlaceSearch", () => {
  it("accepts sign + galaxy + star", () => {
    assert.deepEqual(parseSkyPlaceSearch({ sign: "aries", galaxy: "1", star: "3" }), {
      mesh: undefined,
      desk: undefined,
      sign: "aries",
      galaxy: true,
      star: 3,
    });
  });

  it("rejects unknown sign ids", () => {
    assert.equal(parseSkyPlaceSearch({ sign: "ophiuchus" }).sign, undefined);
  });
});

describe("placeFromSearch / searchFromPlace", () => {
  it("round-trips inside place and omits star 0", () => {
    const place: SkyPlace = { kind: "inside", signId: "aries", star: 0 };
    const search = searchFromPlace(place, { mesh: "leo" });
    assert.deepEqual(search, { mesh: "leo", sign: "aries", galaxy: true, star: undefined });
    assert.deepEqual(placeFromSearch(search), place);
  });

  it("keeps desk ahead of sign", () => {
    const search: SkyPlaceSearch = { desk: "library", sign: "aries", galaxy: true };
    assert.deepEqual(placeFromSearch(search), { kind: "library" });
  });

  it("maps research desks", () => {
    assert.deepEqual(placeFromSearch({ desk: "joey" }), { kind: "research", id: "joey" });
  });
});

describe("placeFromLiveState", () => {
  const signIdAt = (i: number) =>
    (
      [
        "aries",
        "taurus",
        "gemini",
        "cancer",
        "leo",
        "virgo",
        "libra",
        "scorpio",
        "sagittarius",
        "capricorn",
        "aquarius",
        "pisces",
      ] as const
    )[i] ?? null;

  it("reports inside while exploring", () => {
    assert.deepEqual(
      placeFromLiveState({
        surface: "galaxy",
        sessionKind: null,
        explorePhase: "inside",
        exploreSignIndex: 0,
        pointIndex: 2,
        moved: true,
        signIndex: 0,
        signIdAt,
      }),
      { kind: "inside", signId: "aries", star: 2 },
    );
  });

  it("reports belt when moved and idle", () => {
    assert.deepEqual(
      placeFromLiveState({
        surface: "galaxy",
        sessionKind: null,
        explorePhase: "idle",
        exploreSignIndex: null,
        pointIndex: 0,
        moved: true,
        signIndex: 4,
        signIdAt,
      }),
      { kind: "belt", signId: "leo" },
    );
  });

  it("reports library when surface is library", () => {
    assert.deepEqual(
      placeFromLiveState({
        surface: "library",
        sessionKind: null,
        explorePhase: "idle",
        exploreSignIndex: null,
        pointIndex: 0,
        moved: false,
        signIndex: 0,
        signIdAt,
      }),
      { kind: "library" },
    );
  });
});

describe("placesEqual / resolveBootPlace", () => {
  it("compares inside stars", () => {
    assert.equal(
      placesEqual(
        { kind: "inside", signId: "aries", star: 1 },
        { kind: "inside", signId: "aries", star: 1 },
      ),
      true,
    );
    assert.equal(
      placesEqual(
        { kind: "inside", signId: "aries", star: 1 },
        { kind: "inside", signId: "aries", star: 2 },
      ),
      false,
    );
  });

  it("falls back to home when search is empty", () => {
    assert.deepEqual(resolveBootPlace({}), { kind: "home" });
  });
});
