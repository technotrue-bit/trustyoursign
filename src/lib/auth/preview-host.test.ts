import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canBindPreviewOwner, isPreviewHost } from "./preview.ts";

/**
 * The owner preview desk hands a real session to whoever loads the page, so this
 * gate is a security decision: only the live-preview sandbox and loopback may
 * pass. A regression here silently re-opens that door, hence the hostile cases.
 */
describe("the owner-preview host gate", () => {
  it("accepts live-preview (sandbox) hosts", () => {
    assert.equal(isPreviewHost("abc123.grok-sandbox.com"), true);
    assert.equal(isPreviewHost("preview.grok-sandbox.com:443"), true);
    assert.equal(isPreviewHost("  Preview.Grok-Sandbox.Com  "), true);
  });

  it("accepts loopback, spelled any way a host header can", () => {
    for (const host of [
      "localhost",
      "localhost:8080",
      "127.0.0.1",
      "127.0.0.1:8080",
      "[::1]",
      "[::1]:8080",
      "::1",
    ]) {
      assert.equal(isPreviewHost(host), true, host);
    }
  });

  it("refuses every real host", () => {
    for (const host of [
      "trustyoursign.vercel.app",
      "trustyoursigns.grok.me",
      "grok-sandbox.com",
      "evil-grok-sandbox.com",
      "grok-sandbox.com.evil.example",
      "localhost.evil.example",
      "127.0.0.1.evil.example",
      "",
      null,
      undefined,
    ]) {
      assert.equal(isPreviewHost(host), false, String(host));
    }
  });
});

describe("preview owner bind requires an explicit flag", () => {
  const open = {
    allowFlag: "1",
    host: "abc.grok-sandbox.com",
  };

  it("allows a preview host only when ALLOW_PREVIEW_OWNER_BIND=1", () => {
    assert.equal(canBindPreviewOwner(open), true);
    assert.equal(canBindPreviewOwner({ ...open, host: "localhost:8080" }), true);
  });

  it("fails closed when the flag is unset or any value other than 1", () => {
    for (const allowFlag of [undefined, null, "", "0", "true", "yes", "01"]) {
      assert.equal(canBindPreviewOwner({ ...open, allowFlag }), false, String(allowFlag));
    }
  });

  it("accepts 1 with surrounding whitespace", () => {
    assert.equal(canBindPreviewOwner({ ...open, allowFlag: " 1 " }), true);
    assert.equal(canBindPreviewOwner({ ...open, allowFlag: "1\n" }), true);
  });

  it("still refuses Vercel, a configured deploy, and a real host", () => {
    assert.equal(canBindPreviewOwner({ ...open, vercel: "1" }), false);
    assert.equal(
      canBindPreviewOwner({
        ...open,
        grokAuthClientSecret: "secret",
        databaseUrl: "postgres://db",
      }),
      false,
    );
    assert.equal(canBindPreviewOwner({ ...open, host: "trustyoursign.com" }), false);
    assert.equal(canBindPreviewOwner({ ...open, host: null }), false);
  });
});
