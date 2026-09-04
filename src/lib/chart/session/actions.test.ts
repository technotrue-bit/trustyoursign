import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCloseState,
  openClaimState,
  openSessionState,
  patchSessionState,
  setModeState,
  setSurfaceState,
  type VaultDomainState,
} from "./actions.ts";
import { fromVisitor } from "./factories.ts";
import type { Nativity } from "@/lib/chart/schema";

const empty: VaultDomainState = { session: null, claim: null, surface: "galaxy" };

const session = fromVisitor({
  nativity: { id: "visitor", meta: { name: "X" } } as Nativity,
  skyNatal: null,
  birth: { year: 2004, month: 7, day: 26, hour: null, minute: null, place: null },
  signId: "leo",
  origin: "galaxy",
});

describe("session actions", () => {
  it("openSessionState replaces session and clears claim", () => {
    const next = openSessionState(
      { ...empty, claim: { signId: "leo", birth: null } },
      session,
    );
    assert.equal(next.session?.id, session.id);
    assert.equal(next.claim, null);
  });

  it("patchSessionState merges into current session only", () => {
    const opened = openSessionState(empty, session);
    const next = patchSessionState(opened, { tone: "warm", sheetFolded: true });
    assert.equal(next.session?.tone, "warm");
    assert.equal(next.session?.sheetFolded, true);
    assert.equal(patchSessionState(empty, { tone: "warm" }).session, null);
  });

  it("applyCloseState uses closeTarget", () => {
    const opened = openSessionState(empty, { ...session, origin: "library" });
    const closed = applyCloseState(opened);
    assert.equal(closed.session, null);
    assert.equal(closed.surface, "library");
    assert.equal(closed.claim, null);
  });

  it("openClaimState and setSurfaceState", () => {
    const claimed = openClaimState(empty, "leo");
    assert.equal(claimed.claim?.signId, "leo");
    assert.equal(claimed.session, null);
    assert.equal(setSurfaceState(empty, "library").surface, "library");
  });

  it("setModeState clears selection except ask", () => {
    const withSel = {
      ...empty,
      session: { ...session, selection: { kind: "planet" as const, id: "sun" } },
    };
    const sky = setModeState(withSel, "sky");
    assert.equal(sky.session?.selection, null);
    const ask = setModeState(withSel, "ask");
    assert.equal(ask.session?.selection?.id, "sun");
  });
});
