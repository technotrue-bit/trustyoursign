import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { skipIntro, templeIntro } from "./intro.ts";
import { applyWheel, galaxyTravel, resetTravel, wheelFlies } from "./travel.ts";

/** A sky past its introduction with nobody claiming it. */
function openSky() {
  templeIntro.t = Math.max(templeIntro.t, 0.4);
  skipIntro();
  resetTravel(false);
  galaxyTravel.birth = 1;
  galaxyTravel.busy = false;
}

/** Minimal stand-in: the rule only ever consults `closest`. */
function targetMatching(match: (selector: string) => boolean) {
  return { closest: (selector: string) => (match(selector) ? {} : null) } as unknown as EventTarget;
}

describe("the wheel belongs to the sky, not to whatever it happens to be over", () => {
  beforeEach(openSky);

  it("a sideways two-finger scroll is not a flight command", () => {
    const before = galaxyTravel.tTarget;
    applyWheel(0, 420);
    assert.equal(galaxyTravel.tTarget, before, "deltaX must not move the corridor");
    assert.equal(galaxyTravel.wheelUntil, 0, "and it must not arm the flight window");
    assert.equal(galaxyTravel.wheelDriven, false, "and it must not claim the wheel");
  });

  it("a vertical flick still flies, and arms the window", () => {
    galaxyTravel.tTarget = 0.5; // mid-path, so a backwards flick has room to move
    applyWheel(-400);
    assert.ok(
      galaxyTravel.tTarget < 0.5,
      `expected backwards flight, got ${galaxyTravel.tTarget}`,
    );
    assert.equal(galaxyTravel.hold, -1);
    assert.ok(galaxyTravel.wheelUntil > 0, "a real flick arms the window");
    assert.equal(galaxyTravel.wheelDriven, true);
  });

  it("momentum dribble cannot extend the flight window", () => {
    applyWheel(-400);
    const armed = galaxyTravel.wheelUntil;
    for (let i = 0; i < 40; i += 1) applyWheel(-0.3); // the inertia tail
    assert.equal(galaxyTravel.wheelUntil, armed, "the tail must not re-arm");
    assert.equal(galaxyTravel.tTarget >= 0, true);
  });

  it("the canvas flies; chrome, panels and a stray target do not", () => {
    assert.equal(wheelFlies(null), false);
    assert.equal(wheelFlies(targetMatching((s) => s.includes("canvas"))), true);
    assert.equal(wheelFlies(targetMatching((s) => s.includes("[data-fly-surface]"))), true);
    assert.equal(wheelFlies(targetMatching((s) => s.includes("[data-no-fly]"))), false);
    assert.equal(wheelFlies(targetMatching((s) => s.includes("button"))), false);
    assert.equal(wheelFlies(targetMatching((s) => s.includes(".sign-strip"))), false);
    assert.equal(wheelFlies(targetMatching((s) => s.includes("details"))), false);
    assert.equal(wheelFlies(targetMatching((s) => s.includes(".chart-talks"))), false);
    // a bare backdrop behind the chrome is still the sky
    assert.equal(wheelFlies(targetMatching(() => false)), true);
  });
});
