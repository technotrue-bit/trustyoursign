import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isUnauthorizedError } from "./unauthorized.ts";

describe("isUnauthorizedError", () => {
  it("matches the middleware's stable message", () => {
    assert.equal(isUnauthorizedError(new Error("Unauthorized")), true);
  });

  it("matches a wrapped unauthorized message", () => {
    assert.equal(isUnauthorizedError("Request failed: Unauthorized"), true);
  });

  it("does not treat a vault or database failure as a lapsed session", () => {
    assert.equal(isUnauthorizedError(new Error("Unknown sign")), false);
    assert.equal(isUnauthorizedError(new Error("connection timed out")), false);
    assert.equal(isUnauthorizedError(null), false);
  });
});
