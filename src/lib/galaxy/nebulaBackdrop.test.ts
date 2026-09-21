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
  centerWellAlphaAt,
  composeNebulaWallpaper,
  edgeMaskAlphaAt,
  makeCenterWellData,
  makeEdgeAlphaMaskData,
  nebulaCompositeSize,
  nebulaUrl,
  paintCenterVignette,
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
      assert.ok(layer.scale >= 1);
      assert.match(nebulaUrl(layer.id, false), /\/sky\/nebula-.+\.jpg$/);
      assert.match(nebulaUrl(layer.id, true), /-sm\.jpg$/);
    }
    assert.ok(NEBULA_GL_LAYER_GAIN_MODEST < NEBULA_GL_LAYER_GAIN);
    assert.ok(NEBULA_2D_LAYER_GAIN <= 0.65);
  });

  it("keeps the combined mid-screen budget under the white-stack line", () => {
    const sum = NEBULA_LAYERS.reduce((acc, l) => acc + l.opacity, 0);
    const midBudget = sum * NEBULA_GL_LAYER_GAIN * edgeMaskAlphaAt(0);
    assert.ok(midBudget < 0.45, `mid budget ${midBudget.toFixed(3)}`);
  });

  it("edge mask is faint at centre and opaque at edges and corners", () => {
    assert.equal(edgeMaskAlphaAt(0), EDGE_MASK_CENTER_ALPHA);
    assert.ok(EDGE_MASK_CENTER_ALPHA <= 0.15);
    assert.ok(edgeMaskAlphaAt(1) >= 0.95, "edge midpoint");
    assert.ok(edgeMaskAlphaAt(Math.SQRT2) >= 0.95, "corner");
    assert.ok(edgeMaskAlphaAt(0.5) > edgeMaskAlphaAt(0.25));

    const size = 16;
    const data = makeEdgeAlphaMaskData(size);
    assert.equal(data.length, size * size * 4);
    const center = data[((size / 2) * size + size / 2) * 4 + 1]!;
    const corner = data[1]!;
    assert.ok(center <= Math.round(0.2 * 255), `center ${center}`);
    assert.ok(corner >= Math.round(0.95 * 255), `corner ${corner}`);
  });

  it("centre well is dark enough behind the type and clear at the corners", () => {
    assert.ok(CENTER_WELL.alpha >= 0.75);
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
    assert.ok(data[centerIdx + 3]! >= Math.round(0.7 * 255));
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
});
