import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { AppUser } from "./use-current-user.ts";
import {
  STICKY_EMPTY_GRACE_MS,
  applySessionObservation,
  clearStickySession,
  resetStickySessionForTests,
} from "./session-sticky.ts";

const alice: AppUser = {
  id: "a1",
  displayName: "Alice",
  primaryEmail: "a@example.com",
  profileImageUrl: null,
  isDevFallback: false,
};

describe("sticky session across empty get-session reads", { concurrency: false }, () => {
  beforeEach(() => {
    resetStickySessionForTests();
  });

  it("surfaces a live user and remembers them", () => {
    const first = applySessionObservation({
      liveUser: alice,
      isPending: false,
      hasError: false,
      now: 1_000,
    });
    assert.equal(first.user?.id, "a1");
    assert.equal(first.isReadFailed, false);

    // Later subscriber sees the held identity while the first paint is still pending.
    const pending = applySessionObservation({
      liveUser: null,
      isPending: true,
      hasError: false,
      now: 1_100,
    });
    assert.equal(pending.user?.id, "a1");
    assert.equal(pending.isPending, false);
  });

  it("does NOT treat one empty success as signed out", () => {
    applySessionObservation({
      liveUser: alice,
      isPending: false,
      hasError: false,
      now: 1_000,
    });

    const empty = applySessionObservation({
      liveUser: null,
      isPending: false,
      hasError: false,
      now: 1_200,
    });
    assert.equal(empty.user?.id, "a1");
    assert.equal(empty.isReadFailed, true);
    assert.equal(empty.shouldRefetch, true);
  });

  it("keeps the identity on a failed read (phone wake / 429)", () => {
    applySessionObservation({
      liveUser: alice,
      isPending: false,
      hasError: false,
      now: 1_000,
    });

    const failed = applySessionObservation({
      liveUser: null,
      isPending: false,
      hasError: true,
      now: 1_500,
    });
    assert.equal(failed.user?.id, "a1");
    assert.equal(failed.isReadFailed, true);
    assert.equal(failed.shouldRefetch, false);
  });

  it("only drops the identity after the empty grace elapses", () => {
    applySessionObservation({
      liveUser: alice,
      isPending: false,
      hasError: false,
      now: 1_000,
    });
    applySessionObservation({
      liveUser: null,
      isPending: false,
      hasError: false,
      now: 1_100,
    });

    const stillHeld = applySessionObservation({
      liveUser: null,
      isPending: false,
      hasError: false,
      now: 1_100 + STICKY_EMPTY_GRACE_MS - 1,
    });
    assert.equal(stillHeld.user?.id, "a1");

    const gone = applySessionObservation({
      liveUser: null,
      isPending: false,
      hasError: false,
      now: 1_100 + STICKY_EMPTY_GRACE_MS + 1,
    });
    assert.equal(gone.user, null);
    assert.equal(gone.isReadFailed, false);
  });

  it("clearStickySession drops identity immediately (Log out)", () => {
    applySessionObservation({
      liveUser: alice,
      isPending: false,
      hasError: false,
      now: 1_000,
    });
    clearStickySession();
    const after = applySessionObservation({
      liveUser: null,
      isPending: false,
      hasError: false,
      now: 1_050,
    });
    assert.equal(after.user, null);
  });
});
