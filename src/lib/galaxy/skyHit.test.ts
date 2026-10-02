import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { skyChromeOf, stolenSkyChrome, tapWithinSlop } from "./skyHit.ts";

type Fake = {
  closest: (selector: string) => Fake | null;
  hasAttribute?: (name: string) => boolean;
  getAttribute?: (name: string) => string | null;
};

function node(opts: {
  canvas?: boolean;
  chrome?: boolean;
  inert?: boolean;
  disabled?: boolean;
}): Fake {
  const self: Fake = {
    hasAttribute(name: string) {
      return name === "disabled" && Boolean(opts.disabled);
    },
    getAttribute() {
      return null;
    },
    closest(sel: string) {
      if (sel === "[inert]") return opts.inert ? self : null;
      if (sel.includes("canvas") && opts.canvas) return self;
      if ((sel.includes("data-sky-cta") || sel.includes("button")) && opts.chrome) return self;
      return null;
    },
  };
  return self;
}

describe("sky chrome wins a tap the canvas would otherwise eat", () => {
  it("forwards when the canvas is the target and a control sits underneath", () => {
    const canvas = node({ canvas: true });
    const button = node({ chrome: true });
    assert.equal(stolenSkyChrome(canvas as unknown as EventTarget, button as unknown as EventTarget), button);
  });

  it("leaves a tap that already hit the control alone", () => {
    const button = node({ chrome: true });
    assert.equal(stolenSkyChrome(button as unknown as EventTarget, button as unknown as EventTarget), null);
  });

  it("does not invent a click when the sky is empty", () => {
    const canvas = node({ canvas: true });
    const sky = node({});
    assert.equal(stolenSkyChrome(canvas as unknown as EventTarget, sky as unknown as EventTarget), null);
  });

  it("does not retarget a tap that landed on something other than the canvas", () => {
    const other = node({});
    const button = node({ chrome: true });
    assert.equal(stolenSkyChrome(other as unknown as EventTarget, button as unknown as EventTarget), null);
  });

  it("ignores a disabled or inert control", () => {
    assert.equal(skyChromeOf(node({ chrome: true, disabled: true }) as unknown as EventTarget), null);
    assert.equal(skyChromeOf(node({ chrome: true, inert: true }) as unknown as EventTarget), null);
  });

  it("treats a short press as a tap and a drag as a drag", () => {
    assert.equal(tapWithinSlop(0, 0), true);
    assert.equal(tapWithinSlop(8, 8), true);
    assert.equal(tapWithinSlop(12, 0), true);
    assert.equal(tapWithinSlop(13, 0), false);
    assert.equal(tapWithinSlop(9, 9), false);
  });
});
