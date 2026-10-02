import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { skyAfterContextLost, SKY_LOST_RETRY_LIMIT } from "./contextLost.ts";

describe("a lost WebGL context", () => {
  afterEach(() => {
    /* policy is pure; nothing to reset */
  });

  it("pauses for a tap-to-retry before it gives up", () => {
    assert.equal(skyAfterContextLost(1), "retry");
    assert.equal(skyAfterContextLost(SKY_LOST_RETRY_LIMIT - 1), "retry");
  });

  it("falls back to the flat sky once retries are used up", () => {
    assert.equal(skyAfterContextLost(SKY_LOST_RETRY_LIMIT), "flat");
    assert.equal(skyAfterContextLost(SKY_LOST_RETRY_LIMIT + 2), "flat");
  });
});
