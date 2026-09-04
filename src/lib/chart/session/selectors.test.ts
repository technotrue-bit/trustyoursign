import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChartSession, ClaimDraft, Surface } from "./types.ts";
import {
  closeTarget,
  isEntered,
  isResearch,
  isShelf,
  isVisitor,
  nativityOf,
  originOf,
  skyNatalOf,
} from "./selectors.ts";

function baseSession(over: Partial<ChartSession> = {}): ChartSession {
  return {
    id: "s1",
    kind: "visitor",
    chartKey: "visitor",
    label: "Test",
    relation: "self",
    personName: null,
    signId: "leo",
    tone: "vault",
    birth: {
      year: 2004,
      month: 7,
      day: 26,
      hour: 18,
      minute: 21,
      place: "Port Huron",
    },
    nativity: null,
    skyNatal: null,
    origin: "galaxy",
    mode: "sky",
    selection: null,
    hovered: null,
    tourBeat: null,
    sheetFolded: false,
    savedId: undefined,
    ...over,
  };
}

describe("session selectors", () => {
  it("isEntered follows session nullity", () => {
    assert.equal(isEntered(null), false);
    assert.equal(isEntered(baseSession()), true);
  });

  it("reads nativity, skyNatal, origin", () => {
    const s = baseSession({
      nativity: { id: "visitor" } as ChartSession["nativity"],
      skyNatal: { depth: "three" } as ChartSession["skyNatal"],
      origin: "library",
    });
    assert.equal(nativityOf(s)?.id, "visitor");
    assert.equal(skyNatalOf(s)?.depth, "three");
    assert.equal(originOf(s), "library");
    assert.equal(nativityOf(null), null);
  });

  it("kind guards", () => {
    assert.equal(isVisitor(baseSession({ kind: "visitor" })), true);
    assert.equal(isResearch(baseSession({ kind: "research", chartKey: "joey" })), true);
    assert.equal(isShelf(baseSession({ kind: "shelf" })), true);
    assert.equal(isResearch(baseSession({ kind: "visitor" })), false);
  });

  it("closeTarget prefers session.origin, then claim clear, then surface", () => {
    const claim: ClaimDraft = { signId: "leo", birth: null };
    assert.deepEqual(
      closeTarget({ session: baseSession({ origin: "library" }), claim: null, surface: "galaxy" }),
      { surface: "library" as Surface, clearClaim: true },
    );
    assert.deepEqual(
      closeTarget({ session: null, claim, surface: "galaxy" }),
      { surface: "galaxy", clearClaim: true },
    );
    assert.deepEqual(
      closeTarget({ session: null, claim: null, surface: "library" }),
      { surface: "galaxy", clearClaim: false },
    );
  });
});
