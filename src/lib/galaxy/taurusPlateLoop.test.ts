import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  syncTaurusPlateLoop,
  TAURUS_PLATE_LOOP_URL,
  taurusPlateAction,
  taurusPlateVideo,
} from "./taurusPlateLoop.ts";

describe("taurus plate loop", () => {
  it("points at the approved charge file", () => {
    assert.equal(TAURUS_PLATE_LOOP_URL, "/signs/taurus-loop.mp4");
  });

  it("plays on the strip, holds a still while paused, and unloads otherwise", () => {
    assert.equal(
      taurusPlateAction({ onStrip: true, nearby: true, paused: false, reduced: false }),
      "play",
    );
    assert.equal(
      taurusPlateAction({ onStrip: true, nearby: true, paused: true, reduced: false }),
      "still",
    );
    assert.equal(
      taurusPlateAction({ onStrip: false, nearby: true, paused: false, reduced: false }),
      "prime",
    );
    assert.equal(
      taurusPlateAction({ onStrip: true, nearby: true, paused: false, reduced: true }),
      "drop",
    );
    assert.equal(
      taurusPlateAction({ onStrip: false, nearby: false, paused: false, reduced: false }),
      "drop",
    );
    assert.equal(
      taurusPlateAction({ onStrip: false, nearby: true, paused: true, reduced: false }),
      "drop",
    );
  });

  it("does nothing without a document", () => {
    assert.equal(typeof document, "undefined");
    syncTaurusPlateLoop("play");
    syncTaurusPlateLoop("drop");
    assert.equal(taurusPlateVideo(), null);
  });
});
