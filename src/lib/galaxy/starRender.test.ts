import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BufferAttribute, BufferGeometry } from "three";
import { setCloudDrawRange } from "./starRender.ts";

describe("setCloudDrawRange", () => {
  it("zeroes the range when the station is far, then restores stars when live", () => {
    const geo = new BufferGeometry();
    const n = 48;
    geo.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
    geo.setDrawRange(0, n);
    setCloudDrawRange(geo, false);
    assert.equal(geo.drawRange.start, 0);
    assert.equal(geo.drawRange.count, 0);
    setCloudDrawRange(geo, true);
    assert.equal(geo.drawRange.start, 0);
    assert.equal(geo.drawRange.count, n);
  });

  it("is a no-op without a position attribute", () => {
    const geo = new BufferGeometry();
    setCloudDrawRange(geo, true);
    assert.equal(geo.drawRange.count, Infinity);
  });
});
