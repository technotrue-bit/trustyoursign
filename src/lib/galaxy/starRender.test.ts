import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BufferAttribute, BufferGeometry } from "three";
import { GALAXY_FRAG } from "./celestial.ts";
import { STAR_APPEARANCE } from "./starAppearance.ts";
import { STAR_FRAG, STAR_VERT, setCloudDrawRange } from "./starRender.ts";

describe("station star shader", () => {
  it("separates smooth visibility fade from point brightness and hover size", () => {
    assert.match(STAR_VERT, /float visibility = clamp\(uFade/);
    assert.match(STAR_VERT, /visibility \* \(kind > 1\.5/);
    assert.match(STAR_VERT, /mix\(1\.0, uHover, 0\.35\)/);
  });

  it("softens sprite edges before the low-alpha discard", () => {
    assert.match(STAR_FRAG, /smoothstep\(0\.205, 0\.25, r2\)/);
    assert.match(STAR_FRAG, /s < 0\.002/);
    assert.match(GALAXY_FRAG, /smoothstep\(0\.205, 0\.25/);
    assert.match(GALAXY_FRAG, /a < 0\.002/);
    assert.equal(STAR_APPEARANCE.alphaCutoff, 0.002);
  });
});

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
