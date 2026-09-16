import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  galaxyTravel,
  setPaused,
  stepAutoSign,
  stepBirth,
  stepShaderTime,
} from "./travel.ts";
import { useGalaxy } from "./store.ts";

/**
 * I5 — the vestibular pause. These pin the two halves that matter: the shared
 * clock stops advancing, and the scripted animations stop stepping. The
 * renderers read `galaxyTravel.paused` for their own drift, so if the flag
 * ever stops being set, everything here fails together.
 */

afterEach(() => {
  setPaused(false);
  galaxyTravel.birth = 0;
  galaxyTravel.shaderTime = 0;
});

describe("setPaused", () => {
  it("sets the flag the renderers read", () => {
    setPaused(true);
    assert.equal(galaxyTravel.paused, true);
    setPaused(false);
    assert.equal(galaxyTravel.paused, false);
  });

  it("is idempotent and safe without a DOM", () => {
    setPaused(true);
    setPaused(true);
    assert.equal(galaxyTravel.paused, true);
    setPaused(false);
    setPaused(false);
    assert.equal(galaxyTravel.paused, false);
  });

  it("publishes to the store, so scene props (drei's ambient stars) can react", () => {
    setPaused(true);
    assert.equal(useGalaxy.getState().paused, true);
    setPaused(false);
    assert.equal(useGalaxy.getState().paused, false);
  });

  it("drops any held steering when it engages, so nobody resumes mid-thrust", () => {
    galaxyTravel.hold = -1;
    galaxyTravel.steer = 0.4;
    galaxyTravel.dragging = true;
    setPaused(true);
    assert.equal(galaxyTravel.hold, 0);
    assert.equal(galaxyTravel.steer, 0);
    assert.equal(galaxyTravel.dragging, false);
  });
});

describe("the sky clock", () => {
  it("advances while the sky is running", () => {
    const before = galaxyTravel.shaderTime;
    stepShaderTime(0.5);
    assert.ok(galaxyTravel.shaderTime > before);
  });

  it("holds still while paused, and resumes where it stopped", () => {
    setPaused(true);
    const held = stepShaderTime(0.5);
    assert.equal(held, galaxyTravel.shaderTime);
    const frozen = galaxyTravel.shaderTime;
    stepShaderTime(10);
    assert.equal(galaxyTravel.shaderTime, frozen, "a long frame must not jump the sky");

    setPaused(false);
    stepShaderTime(0.25);
    assert.ok(galaxyTravel.shaderTime > frozen);
  });

  it("ignores degenerate deltas", () => {
    const before = galaxyTravel.shaderTime;
    stepShaderTime(Number.NaN);
    stepShaderTime(-1);
    stepShaderTime(0);
    assert.equal(galaxyTravel.shaderTime, before);
  });
});

describe("scripted motion", () => {
  it("freezes the birth mid-boom instead of finishing it", () => {
    galaxyTravel.birth = 0.4;
    setPaused(true);
    for (let i = 0; i < 30; i++) stepBirth(1 / 60);
    assert.equal(galaxyTravel.birth, 0.4, "a paused birth does not advance");
    setPaused(false);
    stepBirth(1 / 60);
    assert.ok(galaxyTravel.birth > 0.4, "resuming continues the birth");
  });

  it("stops the 7s auto-walk", () => {
    setPaused(true);
    const advanced = stepAutoSign(1 / 60, { canAdvance: true });
    assert.equal(advanced, false);
  });
});
