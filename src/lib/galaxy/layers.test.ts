import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GALAXY_LAYER_IDS,
  GALAXY_LAYERS,
  INSIDE_CORNER_RESIDUAL,
  INSIDE_SKY_ARMS_RESIDUAL,
  INSIDE_SKY_FIELD_RESIDUAL,
  INSIDE_SKY_HAZE_RESIDUAL,
  galaxyLayerName,
  isGalaxyLayerId,
} from "./layers.ts";

describe("galaxy layers", () => {
  it("covers the three corridor/ambient passes", () => {
    assert.deepEqual([...GALAXY_LAYER_IDS], ["station-cloud", "dust-field"]);
  });

  it("every id has a stable object name", () => {
    for (const id of GALAXY_LAYER_IDS) {
      assert.equal(GALAXY_LAYERS[id].id, id);
      assert.ok(galaxyLayerName(id).startsWith("vault-layer-"));
      assert.ok(isGalaxyLayerId(id));
    }
  });

  it("rejects unknown ids", () => {
    assert.equal(isGalaxyLayerId("corner"), false);
    assert.equal(isGalaxyLayerId("station-cloud"), true);
  });

  it("keeps inside ambient residuals quiet (atmosphere only)", () => {
    for (const v of [
      INSIDE_SKY_FIELD_RESIDUAL,
      INSIDE_SKY_HAZE_RESIDUAL,
      INSIDE_SKY_ARMS_RESIDUAL,
      INSIDE_CORNER_RESIDUAL,
    ]) {
      assert.ok(v > 0.05 && v < 0.2, `residual ${v} should stay faint`);
    }
    assert.ok(INSIDE_CORNER_RESIDUAL >= INSIDE_SKY_FIELD_RESIDUAL);
  });
});
