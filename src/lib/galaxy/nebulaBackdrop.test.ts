import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CENTER_VIGNETTE_STRENGTH,
  CENTER_WELL,
  EDGE_MASK_CENTER_ALPHA,
  NEBULA_2D_LAYER_GAIN,
  NEBULA_COMPOSITE_DRIFT,
  NEBULA_COMPOSITE_SIZE,
  NEBULA_COMPOSITE_SIZE_MODEST,
  NEBULA_GL_LAYER_GAIN,
  NEBULA_GL_LAYER_GAIN_MODEST,
  NEBULA_LAYERS,
  PLATE_FADE_END,
  PLATE_FADE_START,
  centerWellAlphaAt,
  composeNebulaWallpaper,
  edgeMaskAlphaAt,
  makeCenterWellData,
  makeEdgeAlphaMaskData,
  makePlateEdgeMaskData,
  nebulaCompositeSize,
  nebulaUrl,
  paintCenterVignette,
  plateEdgeAlphaAt,
} from "./nebulaBackdrop.ts";

function vignetteStops(strength?: number) {
  const fills: string[] = [];
  const ctx = {
    createRadialGradient() {
      return {
        addColorStop(_i: number, c: string) {
          fills.push(c);
        },
      };
    },
    fillRect() {},
    set fillStyle(_v: unknown) {},
  };
  paintCenterVignette(ctx as unknown as CanvasRenderingContext2D, 390, 844, strength);
  return fills;
}

describe("nebulaBackdrop", () => {
  it("ships five compressed wallpaper layers at exposure-safe opacities", () => {
    assert.equal(NEBULA_LAYERS.length, 5);
    for (const layer of NEBULA_LAYERS) {
      assert.ok(layer.opacity >= 0.55 && layer.opacity <= 0.75, layer.id);
      assert.ok(layer.scale >= 1.5, `${layer.id} must oversize past the rim`);
      assert.match(nebulaUrl(layer.id, false), /\/sky\/nebula-.+\.jpg$/);
      assert.match(nebulaUrl(layer.id, true), /-sm\.jpg$/);
    }
    assert.ok(NEBULA_GL_LAYER_GAIN_MODEST < NEBULA_GL_LAYER_GAIN);
    assert.ok(NEBULA_2D_LAYER_GAIN <= 0.65);
  });

  it("keeps the centre nebula-bright without a white stack", () => {
    const sum = NEBULA_LAYERS.reduce((acc, l) => acc + l.opacity, 0);
    const midBudget = sum * NEBULA_GL_LAYER_GAIN * edgeMaskAlphaAt(0);
    assert.ok(midBudget > 1.2, `centre was punched black: ${midBudget.toFixed(3)}`);
    assert.ok(midBudget < 2.5, `mid budget ${midBudget.toFixed(3)}`);
  });

  it("centre multiply is a soft well, open at the edges (no opaque frame)", () => {
    assert.equal(edgeMaskAlphaAt(0), EDGE_MASK_CENTER_ALPHA);
    assert.ok(EDGE_MASK_CENTER_ALPHA >= 0.65, "centre stays nebula, not a black punch");
    assert.ok(EDGE_MASK_CENTER_ALPHA < 0.95, "centre is still a little darker");
    assert.ok(edgeMaskAlphaAt(1) >= 0.95, "edge midpoint");
    assert.ok(edgeMaskAlphaAt(Math.SQRT2) >= 0.95, "corner");
    assert.ok(edgeMaskAlphaAt(0.5) > edgeMaskAlphaAt(0.25));

    const size = 16;
    const data = makeEdgeAlphaMaskData(size);
    assert.equal(data.length, size * size * 4);
    const center = data[((size / 2) * size + size / 2) * 4 + 1]!;
    const corner = data[1]!;
    assert.ok(center >= Math.round(0.6 * 255), `center ${center}`);
    assert.ok(center < corner, "centre darker than the rim");
    assert.ok(corner >= Math.round(0.95 * 255), `corner ${corner}`);
  });

  it("soft plate falloff dies before the JPG rectangle rim", () => {
    assert.ok(PLATE_FADE_START < PLATE_FADE_END);
    assert.ok(plateEdgeAlphaAt(0, 0) >= 0.99);
    assert.equal(plateEdgeAlphaAt(1, 0), 0);
    assert.equal(plateEdgeAlphaAt(0, 1), 0);
    assert.equal(plateEdgeAlphaAt(1, 1), 0);
    assert.ok(plateEdgeAlphaAt(0.2, 0.2) > plateEdgeAlphaAt(0.7, 0.7));
    assert.ok(plateEdgeAlphaAt(PLATE_FADE_START, 0) >= 0.99);
    assert.ok(plateEdgeAlphaAt(PLATE_FADE_END, 0) <= 0.01);

    const size = 32;
    const data = makePlateEdgeMaskData(size);
    assert.equal(data.length, size * size * 4);
    const center = data[((size / 2) * size + size / 2) * 4 + 3]!;
    const rim = data[3]!;
    assert.ok(center >= 250, `plate center ${center}`);
    assert.ok(rim <= 2, `plate rim ${rim}`);
  });

  it("centre well is a soft radial veil and clear at the corners", () => {
    assert.ok(CENTER_WELL.alpha >= 0.22 && CENTER_WELL.alpha <= 0.5, "veil, not a black stripe");
    assert.ok(CENTER_WELL.ry > CENTER_WELL.rx, "taller than wide for phones");
    assert.equal(centerWellAlphaAt(0, 0), CENTER_WELL.alpha);
    assert.equal(centerWellAlphaAt(0.5, 0.5), 0);
    assert.equal(centerWellAlphaAt(0.5, 0), 0);
    assert.ok(centerWellAlphaAt(0, 0.2) < CENTER_WELL.alpha);
    assert.ok(centerWellAlphaAt(0, 0.2) > 0);

    const size = 16;
    const data = makeCenterWellData(size);
    assert.equal(data.length, size * size * 4);
    const centerIdx = ((size / 2) * size + size / 2) * 4;
    assert.ok(data[centerIdx + 3]! >= Math.round(0.2 * 255));
    assert.ok(data[centerIdx + 3]! <= Math.round(0.55 * 255));
    assert.equal(data[3], 0, "corner alpha");
    assert.ok(data[centerIdx]! < 20 && data[centerIdx + 1]! < 20 && data[centerIdx + 2]! < 20);
  });

  it("bakes five layers into one composite canvas", () => {
    assert.ok(NEBULA_COMPOSITE_SIZE_MODEST < NEBULA_COMPOSITE_SIZE);
    assert.ok(Number.isFinite(NEBULA_COMPOSITE_DRIFT));
    // jsdom-free: compose returns null without a document; size helper still works.
    assert.equal(nebulaCompositeSize(true), NEBULA_COMPOSITE_SIZE_MODEST);
    assert.equal(nebulaCompositeSize(false), NEBULA_COMPOSITE_SIZE);
    assert.equal(composeNebulaWallpaper(new Map(), 64), null);
  });

  it("vignette keeps a readable charcoal centre", () => {
    const stops = vignetteStops();
    assert.ok(stops.length >= 3);
    assert.ok(stops[0]!.includes("rgba(8, 7, 6"));
    assert.equal(CENTER_VIGNETTE_STRENGTH, 1);
  });
});
