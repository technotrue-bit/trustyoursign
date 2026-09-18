import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  clearSkyGuideSeen,
  markSkyGuideDone,
  readSkyGuideSeen,
  shouldStartSkyGuide,
  skyGuideBeats,
} from "./sky-guide.ts";

describe("sky guide", () => {
  beforeEach(() => {
    clearSkyGuideSeen();
  });

  it("visitor beats cover sky, dock, sheet, ask", () => {
    const beats = skyGuideBeats("visitor");
    assert.deepEqual(
      beats.map((b) => b.target),
      ["sky", "dock", "sheet", "ask"],
    );
  });

  it("shelf beats are sky then ask only", () => {
    const beats = skyGuideBeats("shelf");
    assert.deepEqual(
      beats.map((b) => b.target),
      ["sky", "ask"],
    );
  });

  it("research sessions never start the sky guide", () => {
    assert.equal(shouldStartSkyGuide("research"), false);
    assert.equal(skyGuideBeats("research").length, 0);
  });

  it("starts once until marked done", () => {
    assert.equal(readSkyGuideSeen(), false);
    assert.equal(shouldStartSkyGuide("visitor"), true);
    markSkyGuideDone();
    assert.equal(readSkyGuideSeen(), true);
    assert.equal(shouldStartSkyGuide("visitor"), false);
    assert.equal(shouldStartSkyGuide("shelf"), false);
  });
});
