import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE_OWNER } from "../owner.ts";
import { normalizePasskeyLookupEmail } from "./passkey-lookup-email.ts";

describe("normalizePasskeyLookupEmail", () => {
  it("returns null for empty or partial input", () => {
    assert.equal(normalizePasskeyLookupEmail(""), null);
    assert.equal(normalizePasskeyLookupEmail("   "), null);
    assert.equal(normalizePasskeyLookupEmail("joey"), null);
    assert.equal(normalizePasskeyLookupEmail("not-an-email"), null);
  });

  it("lowercases a plausible email", () => {
    assert.equal(normalizePasskeyLookupEmail("Joey@iCloud.com"), "joey@icloud.com");
  });

  it("maps the owner login alias to the owner email", () => {
    assert.equal(normalizePasskeyLookupEmail("ADMIN"), SITE_OWNER.email.toLowerCase());
  });
});
