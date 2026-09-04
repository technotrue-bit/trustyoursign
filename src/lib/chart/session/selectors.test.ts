import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChartSession, ClaimDraft, Surface } from "./types.ts";
import {
  chartKeyOf,
  closeTarget,
  equalShelfSession,
  isEntered,
  nativityOf,
  originOf,
  sessionKindOf,
  shelfSessionOf,
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

  it("reads session kind and shelf session", () => {
    const shelf = baseSession({ kind: "shelf" });
    assert.equal(chartKeyOf(baseSession()), "visitor");
    assert.equal(chartKeyOf(null), null);
    assert.equal(sessionKindOf(baseSession()), "visitor");
    assert.equal(sessionKindOf(null), null);
    assert.equal(shelfSessionOf(shelf), shelf);
    assert.equal(shelfSessionOf(baseSession()), null);
  });

  it("compares shelf sessions only by shelf-facing fields", () => {
    const shelf = shelfSessionOf(baseSession({ kind: "shelf" }));
    assert.ok(shelf);
    assert.equal(
      equalShelfSession(shelf, {
        ...shelf,
        hovered: { kind: "planet", id: "sun" },
        selection: { kind: "sign", id: "leo" },
      }),
      true,
    );
    assert.equal(equalShelfSession(shelf, { ...shelf, label: "Changed" }), false);
    assert.equal(equalShelfSession(shelf, null), false);
  });

  it("closeTarget prefers session.origin, then claim clear, then surface", () => {
    const claim: ClaimDraft = { signId: "leo", birth: null };
    assert.deepEqual(
      closeTarget({ session: baseSession({ origin: "library" }), claim: null, surface: "galaxy" }),
      { surface: "library" as Surface, clearClaim: true },
    );
    assert.deepEqual(closeTarget({ session: null, claim, surface: "galaxy" }), {
      surface: "galaxy",
      clearClaim: true,
    });
    assert.deepEqual(closeTarget({ session: null, claim: null, surface: "library" }), {
      surface: "galaxy",
      clearClaim: false,
    });
  });
});
