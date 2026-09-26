import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PREVIEW_HISTORY_ROOT_KEY } from "@/lib/preview-host-bridge";
import {
  hasInsideHistoryEntry,
  claimClosesOnHistoryLeave,
  historyModeForPlace,
  historyStateIsRoot,
  markInsideHistoryEntry,
  parseSkyPlaceSearch,
  placeFromLiveState,
  placeFromSearch,
  placesEqual,
  releaseFailedResearchPlace,
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

describe("historyModeForPlace", () => {
  it("pushes when the inside galaxy opens so Back can leave it", () => {
    assert.equal(
      historyModeForPlace({ kind: "belt", signId: "leo" }, { kind: "inside", signId: "leo", star: 0 }),
      "push",
    );
    assert.equal(
      historyModeForPlace({ kind: "home" }, { kind: "inside", signId: "aries", star: 0 }),
      "push",
    );
  });

  it("closes an in-galaxy birth sheet when Back leaves that galaxy", () => {
    assert.equal(
      claimClosesOnHistoryLeave({
        nextKind: "belt",
        exploring: true,
        hasClaim: true,
        hasSession: false,
      }),
      true,
    );
    assert.equal(
      claimClosesOnHistoryLeave({
        nextKind: "home",
        exploring: true,
        hasClaim: true,
        hasSession: false,
      }),
      true,
    );
  });

  it("keeps a claim that is not riding an open galaxy", () => {
    assert.equal(
      claimClosesOnHistoryLeave({
        nextKind: "inside",
        exploring: true,
        hasClaim: true,
        hasSession: false,
      }),
      false,
    );
    assert.equal(
      claimClosesOnHistoryLeave({
        nextKind: "belt",
        exploring: false,
        hasClaim: true,
        hasSession: false,
      }),
      false,
    );
    assert.equal(
      claimClosesOnHistoryLeave({
        nextKind: "belt",
        exploring: true,
        hasClaim: true,
        hasSession: true,
      }),
      false,
    );
    assert.equal(
      claimClosesOnHistoryLeave({
        nextKind: "belt",
        exploring: true,
        hasClaim: false,
        hasSession: false,
      }),
      false,
    );
  });

  it("replaces belt moves, star changes, and leaving the galaxy", () => {
    assert.equal(
      historyModeForPlace({ kind: "home" }, { kind: "belt", signId: "leo" }),
      "replace",
    );
    assert.equal(
      historyModeForPlace(
        { kind: "inside", signId: "leo", star: 0 },
        { kind: "inside", signId: "leo", star: 2 },
      ),
      "replace",
    );
    assert.equal(
      historyModeForPlace(
        { kind: "inside", signId: "leo", star: 0 },
        { kind: "belt", signId: "leo" },
      ),
      "replace",
    );
  });
});

describe("historyStateIsRoot", () => {
  it("treats the preview root flag as the Back floor even when length is above 1", () => {
    assert.equal(historyStateIsRoot({ [PREVIEW_HISTORY_ROOT_KEY]: true }, 4), true);
  });

  it("treats a single untagged entry as the floor", () => {
    assert.equal(historyStateIsRoot({}, 1), true);
    assert.equal(historyStateIsRoot(null, 1), true);
  });

  it("lets Back leave an inside entry that is not the root", () => {
    assert.equal(historyStateIsRoot({ [PREVIEW_HISTORY_ROOT_KEY]: false }, 2), false);
    assert.equal(hasInsideHistoryEntry(), false);
    markInsideHistoryEntry(true);
    assert.equal(hasInsideHistoryEntry(), true);
    markInsideHistoryEntry(false);
  });
});

describe("releaseFailedResearchPlace", () => {
  it("lets go of the desk that failed so ?desk= is not pinned", () => {
    assert.deepEqual(releaseFailedResearchPlace({ kind: "research", id: "joey" }, "joey"), {
      kind: "home",
    });
  });

  it("leaves a different desk or place alone", () => {
    assert.equal(releaseFailedResearchPlace({ kind: "research", id: "saige" }, "joey"), null);
    assert.equal(releaseFailedResearchPlace({ kind: "belt", signId: "aries" }, "joey"), null);
    assert.equal(releaseFailedResearchPlace({ kind: "home" }, "joey"), null);
    assert.equal(releaseFailedResearchPlace(null, "joey"), null);
  });
});
