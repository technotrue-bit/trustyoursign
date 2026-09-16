import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCloseState,
  nextTourState,
  openClaimState,
  openSessionState,
  patchSessionState,
  setModeState,
  setSurfaceState,
  type VaultDomainState,
} from "./actions.ts";
import { fromShelf, fromVisitor } from "./factories.ts";
import type { Nativity } from "@/lib/chart/schema";

const empty: VaultDomainState = { session: null, claim: null, surface: "galaxy" };

const session = fromVisitor({
  nativity: { id: "visitor", meta: { name: "X" } } as Nativity,
  skyNatal: null,
  birth: { year: 2004, month: 7, day: 26, hour: null, minute: null, place: null },
  signId: "leo",
  origin: "galaxy",
});

/** A shelf session: allowed sky + ask only, so a room test has a forbidden mode. */
const shelfSession = fromShelf({
  signId: "leo",
  birth: { year: 2004, month: 7, day: 26, hour: null, minute: null, place: null },
  skyNatal: null,
  label: "Shelf",
  origin: "library",
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

  it("setModeState no-ops forbidden modes for a shelf session", () => {
    // Visitors are allowed every room (see rooms.ts), so the restriction that
    // exists today is on shelf sessions: sky + ask only.
    const opened = openSessionState(empty, shelfSession);
    const before = opened.session?.mode;
    const blocked = setModeState(opened, "bones");
    assert.equal(blocked.session?.mode, before, "the forbidden mode is ignored");
    assert.equal(blocked, opened, "and nothing is re-created");
  });

  it("setModeState lets a visitor into every room", () => {
    const opened = openSessionState(empty, session);
    const next = setModeState(opened, "gates");
    assert.equal(next.session?.mode, "gates");
  });

  it("setModeState still applies allowed modes", () => {
    const opened = openSessionState(empty, session);
    const next = setModeState(opened, "bones");
    assert.equal(next.session?.mode, "bones");
  });

  it("nextTourState no-ops when beat mode is illegal for kind", () => {
    const shelf = fromShelf({
      signId: "leo",
      birth: { year: 2004, month: 7, day: 26, hour: null, minute: null, place: null },
      skyNatal: null,
      label: "Shelf chart",
      origin: "library",
      mode: "sky",
    });
    const opened = openSessionState(empty, shelf);
    const blocked = nextTourState(opened, {
      id: "body-wells",
      mode: "body",
      selection: { kind: "planet", id: "sun" },
    });
    assert.equal(blocked.session?.mode, "sky");
    assert.equal(blocked.session?.tourBeat, null);
    assert.equal(blocked, opened);
  });
});
