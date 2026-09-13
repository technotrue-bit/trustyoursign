import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldFreezeAppHeight } from "./stageLockPolicy.ts";

describe("shouldFreezeAppHeight", () => {
  it("freezes while a path field is focused", () => {
    assert.equal(shouldFreezeAppHeight({ pathFieldFocused: true }), true);
  });

  it("resumes when focus leaves the path field", () => {
    assert.equal(shouldFreezeAppHeight({ pathFieldFocused: false }), false);
  });
});
