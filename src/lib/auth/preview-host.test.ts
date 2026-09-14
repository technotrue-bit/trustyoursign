import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPreviewHost } from "./preview.ts";

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
