import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SIGN_IDS } from "../chart/sign-canon.ts";
import { insightsForSign, sampleInsightForSign } from "./signInsights.ts";

describe("sampleInsightForSign", () => {
  it("uses the sign you are on, not a shared Taurus reading", () => {
    const taurus = sampleInsightForSign("taurus");
    const gemini = sampleInsightForSign("gemini");
    assert.ok(taurus);
    assert.ok(gemini);
    assert.equal(taurus.tone, "info");
    assert.equal(taurus.title, "Enoughness");
    assert.match(taurus.body, /Taurus is the nervous system/);
    assert.equal(gemini.tone, "info");
    assert.equal(gemini.title, "Two channels");
    assert.match(gemini.body, /Gemini is bandwidth/);
    assert.doesNotMatch(gemini.body, /Taurus/);
    assert.notEqual(gemini.body, taurus.body);
  });

  it("returns that sign's own Insight register for every sign", () => {
    const bodies = SIGN_IDS.map((id) => {
      const sample = sampleInsightForSign(id);
      assert.ok(sample, id);
      assert.equal(sample.tone, "info");
      const owned = insightsForSign(id).some(
        (item) => item.title === sample.title && item.body === sample.body && item.tone === "info",
      );
      assert.equal(owned, true, `${id} sample is not one of its insights`);
      assert.equal(
        sample.body.includes("Taurus"),
        id === "taurus",
        `${id} sample should mention Taurus only when the sign is Taurus`,
      );
      return sample.body;
    });
    assert.equal(new Set(bodies).size, SIGN_IDS.length);
  });
});
