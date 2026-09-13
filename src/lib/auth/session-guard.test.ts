import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSessionGuardState } from "./session-guard.ts";

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
