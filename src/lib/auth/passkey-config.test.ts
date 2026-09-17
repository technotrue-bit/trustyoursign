import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLATFORM_AUTHENTICATOR_SELECTION,
  passkeyAvailable,
  passkeyRpConfig,
} from "./passkey-config.ts";

describe("passkeyRpConfig", () => {
  it("pins rpID and origin from a stable public URL", () => {
    assert.deepEqual(passkeyRpConfig("https://trustyoursigns.grok.me"), {
      rpName: "Trust Your Sign",
      rpID: "trustyoursigns.grok.me",
      origin: "https://trustyoursigns.grok.me",
      authenticatorSelection: { ...PLATFORM_AUTHENTICATOR_SELECTION },
    });
  });

  it("strips a trailing slash from the origin", () => {
    assert.equal(
      passkeyRpConfig("https://trustyoursigns.grok.me/")?.origin,
      "https://trustyoursigns.grok.me",
    );
  });

  it("leaves rpID unset when there is no stable URL (local / preview)", () => {
    assert.deepEqual(passkeyRpConfig(undefined), {
      rpName: "Trust Your Sign",
      authenticatorSelection: { ...PLATFORM_AUTHENTICATOR_SELECTION },
    });
  });

  it("falls back to name-only when the URL is unparseable", () => {
    assert.deepEqual(passkeyRpConfig("not a url"), {
      rpName: "Trust Your Sign",
      authenticatorSelection: { ...PLATFORM_AUTHENTICATOR_SELECTION },
    });
  });

  it("defaults registration to platform Face ID (not cross-platform)", () => {
    const selection = passkeyRpConfig("https://trustyoursign.com").authenticatorSelection;
    assert.equal(selection.authenticatorAttachment, "platform");
    assert.equal(selection.residentKey, "preferred");
    assert.equal(selection.userVerification, "required");
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
