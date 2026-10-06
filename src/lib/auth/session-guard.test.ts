import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  initialSessionGateMemory,
  reduceSessionGate,
  resolveSessionGateView,
  resolveSessionGuardState,
  type SessionGateMemory,
  type SessionGuardState,
} from "./session-guard.ts";

describe("a guarded route decides from the session", () => {
  it("shows the page when there is a user", () => {
    assert.equal(
      resolveSessionGuardState({ isPending: false, isReadFailed: false, hasUser: true }),
      "signed_in",
    );
  });

  it("waits while the session is still resolving", () => {
    assert.equal(
      resolveSessionGuardState({ isPending: true, isReadFailed: false, hasUser: false }),
      "loading",
    );
  });

  it("does NOT treat a failed read as signed out", () => {
    // The regression: a dropped session request (phone waking from the app
    // switcher) sent visitors to sign-in even though the cookie was intact.
    assert.equal(
      resolveSessionGuardState({ isPending: false, isReadFailed: true, hasUser: false }),
      "unavailable",
    );
  });

  it("sends only a definite 'no session' to sign-in", () => {
    assert.equal(
      resolveSessionGuardState({ isPending: false, isReadFailed: false, hasUser: false }),
      "signed_out",
    );
  });

  it("a user wins over a failed read — being signed in is never in doubt", () => {
    assert.equal(
      resolveSessionGuardState({ isPending: false, isReadFailed: true, hasUser: true }),
      "signed_in",
    );
  });

  it("a user wins over a pending read, so nothing flickers away", () => {
    assert.equal(
      resolveSessionGuardState({ isPending: true, isReadFailed: false, hasUser: true }),
      "signed_in",
    );
  });
});

/** Apply a run of guard observations the way the gate paints them, counting re-reads. */
function driveGate(guards: SessionGuardState[]): {
  memory: SessionGateMemory;
  views: string[];
  rechecks: number;
} {
  let memory = initialSessionGateMemory;
  const views: string[] = [];
  let rechecks = 0;
  for (const guard of guards) {
    const before = memory.refetchOwed;
    const step = reduceSessionGate(memory, { type: "observe", guard });
    memory = step.memory;
    views.push(step.view);
    if (!before && memory.refetchOwed) rechecks += 1;
    // The gate sends the owed re-read once, then clears the flag.
    if (memory.refetchOwed) memory = { ...memory, refetchOwed: false };
  }
  return { memory, views, rechecks };
}

describe("the session gate screen", () => {
  it("a failed read shows unavailable, not signed out", () => {
    const guard = resolveSessionGuardState({
      isPending: false,
      isReadFailed: true,
      hasUser: false,
    });
    assert.equal(guard, "unavailable");
    // The hold starts open. That must not turn a failed read into sign-in.
    assert.equal(resolveSessionGateView({ guard, graceOpen: true }), "unavailable");
    assert.equal(resolveSessionGateView({ guard, graceOpen: false }), "unavailable");

    const driven = driveGate(Array.from({ length: 12 }, () => "unavailable" as const));
    assert.equal(driven.rechecks, 0);
    assert.ok(driven.views.every((view) => view === "unavailable"));
  });

  it("a definite sign-out reaches login after the hold, and not before", () => {
    const guard = resolveSessionGuardState({
      isPending: false,
      isReadFailed: false,
      hasUser: false,
    });
    assert.equal(guard, "signed_out");

    const holding = reduceSessionGate(initialSessionGateMemory, { type: "observe", guard });
    assert.equal(holding.view, "loading");
    assert.equal(resolveSessionGateView({ guard, graceOpen: true }), "loading");
    // A repeat paint of the same empty read must not look like a new one.
    const repeat = reduceSessionGate(holding.memory, { type: "observe", guard });
    assert.equal(repeat.memory, holding.memory);
    assert.equal(repeat.view, "loading");

    const released = reduceSessionGate(holding.memory, { type: "graceElapsed" });
    assert.equal(released.view, "redirect");
    assert.equal(resolveSessionGateView({ guard, graceOpen: false }), "redirect");
  });

  it("log-out asks for the session once, not on every render", () => {
    const storm = [
      "signed_in",
      "signed_in",
      "signed_out",
      ...Array.from({ length: 20 }, () => "signed_out" as const),
      "loading",
      "signed_out",
      "loading",
      "signed_out",
      "signed_out",
    ] as const;
    const driven = driveGate([...storm]);
    assert.equal(driven.rechecks, 1);
    // While the hold is open the empty read stays on the checking screen.
    const firstSignedOut = driven.views.indexOf("loading");
    assert.ok(firstSignedOut >= 0);
    assert.equal(driven.views.at(-1), "loading");

    const released = reduceSessionGate(driven.memory, { type: "graceElapsed" });
    assert.equal(released.view, "redirect");
    const again = driveGate([
      ...storm,
      ...Array.from({ length: 10 }, () => "signed_out" as const),
    ]);
    assert.equal(again.rechecks, 1);
  });
});
