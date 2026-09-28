import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ownerPasswordMatches, readOwnerPassword } from "./owner-password.server.ts";

describe("owner password", () => {
  it("matches the operator secret and nothing else", () => {
    assert.equal(ownerPasswordMatches("correct horse", "correct horse"), true);
    assert.equal(ownerPasswordMatches("correct horse", "correct horses"), false);
    assert.equal(ownerPasswordMatches("", "correct horse"), false);
    assert.equal(ownerPasswordMatches("True", "True"), true);
  });

  it("ignores the compromised legacy value", () => {
    const previous = process.env.OWNER_PASSWORD;
    process.env.OWNER_PASSWORD = "True";
    try {
      assert.equal(readOwnerPassword(), undefined);
    } finally {
      if (previous === undefined) delete process.env.OWNER_PASSWORD;
      else process.env.OWNER_PASSWORD = previous;
    }
  });
});
