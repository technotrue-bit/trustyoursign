import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import {
  PLATFORM_AUTH_HINTS,
  withPlatformAuthHints,
  withPlatformAuthOptions,
} from "./passkey-hints.ts";

describe("withPlatformAuthHints", () => {
  it("injects client-device as the sole hint without dropping server fields", () => {
    const server: PublicKeyCredentialRequestOptionsJSON = {
      challenge: "abc",
      rpId: "trustyoursign.com",
      timeout: 60_000,
      userVerification: "preferred",
      allowCredentials: [],
    };
    const merged = withPlatformAuthHints(server);
    assert.deepEqual(merged.hints, [...PLATFORM_AUTH_HINTS]);
    assert.equal(merged.challenge, "abc");
    assert.equal(merged.rpId, "trustyoursign.com");
    assert.equal(merged.userVerification, "preferred");
    assert.deepEqual(merged.allowCredentials, []);
  });

  it("overwrites any prior hints so hybrid is not preferred", () => {
    const server = {
      challenge: "xyz",
      hints: ["hybrid", "security-key"],
    } as PublicKeyCredentialRequestOptionsJSON;
    assert.deepEqual(withPlatformAuthHints(server).hints, ["client-device"]);
  });
});

describe("withPlatformAuthOptions", () => {
  it("keeps hints-only when there are no local credential IDs", () => {
    const server: PublicKeyCredentialRequestOptionsJSON = {
      challenge: "abc",
      allowCredentials: [],
    };
    const merged = withPlatformAuthOptions(server, []);
    assert.deepEqual(merged.hints, ["client-device"]);
    assert.deepEqual(merged.allowCredentials, []);
  });

  it("merges local credential IDs into allowCredentials alongside hints", () => {
    const server: PublicKeyCredentialRequestOptionsJSON = {
      challenge: "abc",
      allowCredentials: [{ id: "already", type: "public-key" }],
    };
    const merged = withPlatformAuthOptions(server, ["already", "local-one", "local-two"]);
    assert.deepEqual(merged.hints, ["client-device"]);
    assert.deepEqual(
      merged.allowCredentials?.map((c) => c.id),
      ["already", "local-one", "local-two"],
    );
    assert.equal(
      merged.allowCredentials?.find((c) => c.id === "local-one")?.transports?.[0],
      "internal",
    );
  });
});
