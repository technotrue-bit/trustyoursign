import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GALAXY_LAYER_IDS,
  GALAXY_LAYERS,
  galaxyLayerName,
  isGalaxyLayerId,
} from "./layers.ts";

describe("galaxy layers", () => {
  it("covers the three corridor/ambient passes", () => {
    assert.deepEqual([...GALAXY_LAYER_IDS], ["station-cloud", "sign-disk", "dust-field"]);
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
});
