import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAppTop,
  shouldApplyVisualViewportScroll,
  shouldFreezeAppHeight,
} from "./stageLockPolicy.ts";

describe("shouldFreezeAppHeight", () => {
  it("freezes while a path field is focused", () => {
    assert.equal(shouldFreezeAppHeight({ pathFieldFocused: true }), true);
  });

  it("resumes when focus leaves the path field", () => {
    assert.equal(shouldFreezeAppHeight({ pathFieldFocused: false }), false);
  });
});

describe("resolveAppTop", () => {
  it("ignores rubber-band offsetTop when no path field is focused", () => {
    assert.equal(resolveAppTop({ pathFieldFocused: false, offsetTop: 48 }), 0);
    assert.equal(resolveAppTop({ pathFieldFocused: false, offsetTop: -22 }), 0);
  });

  it("follows offsetTop while a BirthChat path field is focused", () => {
    assert.equal(resolveAppTop({ pathFieldFocused: true, offsetTop: 48.6 }), 49);
    assert.equal(resolveAppTop({ pathFieldFocused: true, offsetTop: 0 }), 0);
  });
});

describe("shouldApplyVisualViewportScroll", () => {
  it("skips VV scroll updates during idle rubber-band", () => {
    assert.equal(shouldApplyVisualViewportScroll({ pathFieldFocused: false }), false);
  });

  it("applies VV scroll while the path keyboard is open", () => {
    assert.equal(shouldApplyVisualViewportScroll({ pathFieldFocused: true }), true);
  });
});
