import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAppHeight } from "../lib/stage-height.ts";

describe("resolveAppHeight", () => {
  it("tracks live visual viewport height when no path field is focused", () => {
    const a = resolveAppHeight({
      vvHeight: 844,
      innerHeight: 844,
      pathFieldFocused: false,
      frozenHeight: null,
    });
    assert.equal(a.height, 844);
    assert.equal(a.nextFrozen, 844);

    const b = resolveAppHeight({
      vvHeight: 520,
      innerHeight: 844,
      pathFieldFocused: false,
      frozenHeight: 844,
    });
    assert.equal(b.height, 520);
    assert.equal(b.nextFrozen, 520);
  });

  it("freezes height while a path field is focused even if vv shrinks", () => {
    const r = resolveAppHeight({
      vvHeight: 480,
      innerHeight: 844,
      pathFieldFocused: true,
      frozenHeight: 844,
    });
    assert.equal(r.height, 844);
    assert.equal(r.nextFrozen, 844);
  });

  it("falls back to live height when focused but freeze was never captured", () => {
    const r = resolveAppHeight({
      vvHeight: 500,
      innerHeight: 844,
      pathFieldFocused: true,
      frozenHeight: null,
    });
    assert.equal(r.height, 500);
    assert.equal(r.nextFrozen, 500);
  });
});
