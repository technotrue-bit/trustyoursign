import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Nativity } from "@/lib/chart/schema";
import {
  clearClaim,
  openSession,
  setClaim,
  type VaultDomainState,
} from "./actions.ts";
import { fromVisitor } from "./factories.ts";
import { hasSession, isClaiming, isVisitorSession } from "./selectors.ts";

const empty: VaultDomainState = { session: null, claim: null, surface: "galaxy" };

const birth = {
  year: 2004,
  month: 7,
  day: 26,
  hour: null,
  minute: null,
  place: null,
};

describe("ChartSession S0", () => {
  it("fromVisitor returns visitor / chartKey visitor / origin galaxy", () => {
    const session = fromVisitor({
      nativity: { id: "visitor", meta: { name: "You" } } as Nativity,
      skyNatal: null,
      birth,
      signId: "leo",
      origin: "galaxy",
    });
    assert.equal(session.kind, "visitor");
    assert.equal(session.chartKey, "visitor");
    assert.equal(session.origin, "galaxy");
    assert.equal(session.signId, "leo");
  });

  it("setClaim / clearClaim keep session null", () => {
    const claimed = setClaim(empty, "aries");
    assert.equal(claimed.session, null);
    assert.equal(claimed.claim?.signId, "aries");
    assert.equal(claimed.claim?.birth, null);
    const cleared = clearClaim(claimed);
    assert.equal(cleared.claim, null);
    assert.equal(cleared.session, null);
  });

  it("openSession(fromVisitor) lands a visitor session and clears claim", () => {
    const claimed = setClaim(empty, "leo");
    const session = fromVisitor({
      nativity: { id: "visitor", meta: { name: "You" } } as Nativity,
      skyNatal: null,
      birth,
      signId: "leo",
      origin: "galaxy",
    });
    const next = openSession(claimed, session);
    assert.equal(next.session?.kind, "visitor");
    assert.equal(next.session?.chartKey, "visitor");
    assert.equal(next.claim, null);
    assert.equal(next.surface, "galaxy");
  });

  it("isClaiming is true iff claim is set and session is null", () => {
    assert.equal(isClaiming(null, null), false);
    const claimed = setClaim(empty, "pisces");
    assert.equal(isClaiming(claimed.claim, claimed.session), true);
    assert.equal(hasSession(claimed.session), false);
    const session = fromVisitor({
      nativity: { id: "visitor", meta: { name: "You" } } as Nativity,
      skyNatal: null,
      birth,
      signId: "pisces",
      origin: "galaxy",
    });
    const opened = openSession(claimed, session);
    assert.equal(isClaiming(opened.claim, opened.session), false);
    assert.equal(hasSession(opened.session), true);
    assert.equal(isVisitorSession(opened.session), true);
    assert.equal(isVisitorSession(null), false);
  });
});
