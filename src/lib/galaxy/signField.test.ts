import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIELD_KEEP_DIST,
  LAND_DIST,
  LEAVE_DIST,
  burstEnvelope,
  cloudBurstGain,
  createArriveBurst,
  fieldFade,
  fieldGather,
  fieldVisible,
  stepArriveBurst,
} from "./signField.ts";
import { kickDiskBurst } from "./disk.ts";

describe("sign field keep-alive", () => {
  it("stays visible through a light scroll", () => {
    const light = 0.04;
    assert.ok(light < FIELD_KEEP_DIST);
    const g = fieldGather(light);
    assert.ok(fieldVisible(g), `gather ${g} should stay live at dist ${light}`);
    assert.ok(fieldFade(g) > 0.45);
  });

  it("hides only after leaving the sign", () => {
    assert.equal(fieldVisible(fieldGather(0.13)), false);
    assert.equal(fieldFade(fieldGather(0.13)), 0);
    assert.ok(fieldVisible(fieldGather(0)));
    assert.equal(fieldFade(fieldGather(0)), 1);
  });
});

describe("arrive burst", () => {
  it("fires once on land and ignores a light nudge", () => {
    const s = createArriveBurst();
    const first = stepArriveBurst(s, { aimed: 0, dist: 0.002, dt: 0.016 });
    assert.equal(first.fired, true);
    assert.equal(s.burst, 1);
    const nudge = stepArriveBurst(s, { aimed: 0, dist: 0.04, dt: 0.016 });
    assert.equal(nudge.fired, false);
    const still = stepArriveBurst(s, { aimed: 0, dist: 0.01, dt: 0.016 });
    assert.equal(still.fired, false);
  });

  it("rearms after leaving, then fires on return", () => {
    const s = createArriveBurst();
    stepArriveBurst(s, { aimed: 4, dist: 0, dt: 0.016 });
    const far = stepArriveBurst(s, { aimed: 4, dist: LEAVE_DIST + 0.01, dt: 0.016 });
    assert.equal(far.fired, false);
    assert.equal(s.far, true);
    const back = stepArriveBurst(s, { aimed: 4, dist: LAND_DIST - 0.002, dt: 0.016 });
    assert.equal(back.fired, true);
  });

  it("pauses during intro so Skip is the land", () => {
    const s = createArriveBurst();
    const paused = stepArriveBurst(s, { aimed: 0, dist: 0, dt: 0.016, paused: true });
    assert.equal(paused.fired, false);
    assert.equal(s.far, true);
    const rest = stepArriveBurst(s, { aimed: 0, dist: 0, dt: 0.016, paused: false });
    assert.equal(rest.fired, true);
  });

  it("reduced motion does not kick", () => {
    const s = createArriveBurst();
    const r = stepArriveBurst(s, { aimed: 2, dist: 0, dt: 0.016, reduced: true });
    assert.equal(r.fired, false);
    assert.ok(r.burst > 0 && r.burst < 1);
  });

  it("cloud gain peaks on land and rests at 1", () => {
    assert.ok(cloudBurstGain(1).swirl > 1.5);
    assert.ok(cloudBurstGain(1).opacity > 1.3);
    assert.equal(cloudBurstGain(0).swirl, 1);
    assert.ok(burstEnvelope(1) > burstEnvelope(0.4));
  });
});

describe("kickDiskBurst", () => {
  it("adds energy to the existing pool", () => {
    const n = 40;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = 0.4;
      pos[i * 3 + 2] = 0.2;
    }
    kickDiskBurst({ n, pos, vel }, 1);
    let energy = 0;
    for (let i = 0; i < n * 3; i++) energy += Math.abs(vel[i]!);
    assert.ok(energy > 4, `kick energy ${energy}`);
    kickDiskBurst({ n, pos, vel }, 0);
    let same = 0;
    for (let i = 0; i < n * 3; i++) same += Math.abs(vel[i]!);
    assert.equal(same, energy);
  });
});
