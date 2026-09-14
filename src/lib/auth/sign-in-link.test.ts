import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSignInLinkRelay, SIGN_IN_LINK_EXPIRES_SECONDS } from "./sign-in-link.ts";

describe("the sign-in link relay", () => {
  it("hands the next link for that address to the code email", () => {
    const relay = createSignInLinkRelay();
    let captured: string | undefined;
    relay.absorb("vault@example.com", (url) => {
      captured = url;
    });

    assert.equal(relay.offer("vault@example.com", "https://x.test/verify?token=1"), true);
    assert.equal(captured, "https://x.test/verify?token=1");
  });

  it("never crosses two visitors in flight on the same instance", () => {
    const relay = createSignInLinkRelay();
    let captured: string | undefined;
    relay.absorb("a@example.com", (url) => {
      captured = url;
    });

    assert.equal(
      relay.offer("b@example.com", "https://x.test/verify?token=b"),
      false,
      "b never claims a link minted for a",
    );
    assert.equal(captured, undefined);
  });

  it("matches an address whatever the case or surrounding space", () => {
    const relay = createSignInLinkRelay();
    let captured: string | undefined;
    relay.absorb("  Vault@Example.com ", (url) => {
      captured = url;
    });

    assert.equal(relay.offer("vault@example.com", "https://x.test/verify?token=1"), true);
    assert.equal(captured, "https://x.test/verify?token=1");
  });

  it("claims a link exactly once", () => {
    const relay = createSignInLinkRelay();
    relay.absorb("vault@example.com", () => {});

    assert.equal(relay.offer("vault@example.com", "https://x.test/verify?token=1"), true);
    assert.equal(relay.offer("vault@example.com", "https://x.test/verify?token=2"), false);
  });

  it("offers nothing when no send is in flight", () => {
    assert.equal(
      createSignInLinkRelay().offer("vault@example.com", "https://x.test/verify?token=1"),
      false,
      "a link minted outside a code sign-in is emailed on its own, not captured",
    );
  });

  it("stops claiming once the send is over, even if the mint failed", () => {
    const relay = createSignInLinkRelay();
    relay.absorb("vault@example.com", () => {});
    relay.release();

    assert.equal(relay.offer("vault@example.com", "https://x.test/verify?token=1"), false);
  });

  it("keeps a tap valid longer than a typed code", () => {
    assert.ok(
      SIGN_IN_LINK_EXPIRES_SECONDS > 300,
      "the link outlives the 5-minute code so a slow inbox is not a failed sign-in",
    );
  });
});
