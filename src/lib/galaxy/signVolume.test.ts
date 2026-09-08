import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BufferAttribute } from "three";
import type { SignId } from "@/lib/chart/types";

import {
  VOLUME_SIGN_IDS,
  hasVolumeSign,
  buildShellGeometryFromVolume,
  interiorCloudFromVolume,
  depthFactor,
  MAX_DEPTH_FACTOR,
  DEPTH_SCALE,
  type SignVolume,
} from "./signVolume.ts";

function fixtureVolume(): SignVolume {
  const cols = 8;
  const rows = 6;
  const alpha = new Float32Array(cols * rows);
  const depth = new Float32Array(cols * rows);
  // Filled rectangle inset by 1 cell
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      alpha[i] = 1;
      // thicker in center
      const nx = x / (cols - 1) - 0.5;
      const ny = y / (rows - 1) - 0.5;
      depth[i] = 0.28 - Math.hypot(nx, ny) * 0.15;
    }
  }
  return {
    id: "sagittarius" as SignId,
    aspect: 16 / 9,
    cols,
    rows,
    depth,
    alpha,
    stars: [{ x: 0, y: 0, z: 0.2, mag: 1 }],
  };
}

describe("depth calibration", () => {
  it("caps the theoretical worst-case half-thickness at 0.35 (target band 0.22–0.35)", () => {
    // Measured on real sagittarius.png after art load: ~0.23 at 72x42 (full),
    // ~0.28 at 52x30 (small-GPU) grid — both inside the 0.22–0.35 target band.
    const worstCase = depthFactor(1, 1) * DEPTH_SCALE;
    assert.equal(worstCase, MAX_DEPTH_FACTOR * DEPTH_SCALE);
    assert.ok(worstCase <= 0.35, `expected worst-case depth <= 0.35, got ${worstCase}`);
    assert.ok(worstCase >= 0.2, `expected worst-case depth to still read as a body, got ${worstCase}`);
  });
});

describe("VOLUME_SIGN_IDS", () => {
  it("keeps the vault on painted plates (volume is mesh-review only)", () => {
    assert.equal(hasVolumeSign("sagittarius"), false);
    assert.equal(hasVolumeSign("aries"), false);
    assert.equal(VOLUME_SIGN_IDS.size, 0);
  });
});

describe("buildShellGeometryFromVolume", () => {
  it("returns a closed mesh with front and back z signs", () => {
    const geo = buildShellGeometryFromVolume(fixtureVolume());
    assert.ok(geo);
    const pos = geo.getAttribute("position") as BufferAttribute;
    assert.ok(pos.count > 20);
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    assert.ok(maxZ > 0.08, `expected front thickness, got maxZ=${maxZ}`);
    assert.ok(minZ < -0.08, `expected back thickness, got minZ=${minZ}`);
    // Index buffer present (rim + caps)
    assert.ok(geo.getIndex() && geo.getIndex()!.count >= 36);
    geo.dispose();
  });
});

describe("interiorCloudFromVolume", () => {
  it("samples stars through ±Z inside the body", () => {
    const cloud = interiorCloudFromVolume(fixtureVolume(), 200);
    assert.equal(cloud.length, 200);
    let neg = 0;
    let pos = 0;
    for (const s of cloud) {
      if (s.z < -0.02) neg++;
      if (s.z > 0.02) pos++;
      assert.ok(Math.abs(s.x) <= 0.55);
      assert.ok(Math.abs(s.y) <= 0.55);
    }
    assert.ok(neg > 20, `expected interior negative z, got ${neg}`);
    assert.ok(pos > 20, `expected interior positive z, got ${pos}`);
  });
});
