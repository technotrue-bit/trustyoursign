import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { passkeyAvailable, passkeyRpConfig } from "./passkey-config.ts";

describe("passkeyRpConfig", () => {
  it("pins rpID and origin from a stable public URL", () => {
    assert.deepEqual(passkeyRpConfig("https://trustyoursigns.grok.me"), {
      rpName: "Trust Your Sign",
      rpID: "trustyoursigns.grok.me",
      origin: "https://trustyoursigns.grok.me",
    });
  });

  it("strips a trailing slash from the origin", () => {
    assert.equal(
      passkeyRpConfig("https://trustyoursigns.grok.me/")?.origin,
      "https://trustyoursigns.grok.me",
    );
  });

  it("leaves rpID unset when there is no stable URL (local / preview)", () => {
    assert.deepEqual(passkeyRpConfig(undefined), { rpName: "Trust Your Sign" });
  });

  it("falls back to name-only when the URL is unparseable", () => {
    assert.deepEqual(passkeyRpConfig("not a url"), { rpName: "Trust Your Sign" });
  });
});

describe("passkeyAvailable", () => {
  it("is off when auth is disabled", () => {
    assert.equal(passkeyAvailable(true), false);
  });

  it("is on when auth is enabled", () => {
    assert.equal(passkeyAvailable(false), true);
  });
});
