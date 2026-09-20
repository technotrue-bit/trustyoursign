import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NEBULA_LAYERS,
  nebulaUrl,
  paintCenterVignette,
} from "./nebulaBackdrop.ts";

describe("nebulaBackdrop", () => {
  it("ships five compressed wallpaper layers", () => {
    assert.equal(NEBULA_LAYERS.length, 5);
    for (const layer of NEBULA_LAYERS) {
      assert.ok(layer.opacity > 0.5 && layer.opacity <= 1);
      assert.ok(layer.scale >= 1);
      assert.match(nebulaUrl(layer.id, false), /\/sky\/nebula-.+\.jpg$/);
      assert.match(nebulaUrl(layer.id, true), /-sm\.jpg$/);
    }
  });

  it("paints a center vignette without touching edges fully opaque", () => {
    const canvas = {
      width: 100,
      height: 100,
      getContext() {
        return null;
      },
    };
    // Minimal 2d context stub for the gradient path.
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
    paintCenterVignette(ctx as unknown as CanvasRenderingContext2D, 390, 844, 0.7);
    assert.ok(fills.some((c) => c.includes("0)")));
    assert.ok(fills.some((c) => /0\.\d+/.test(c)));
    void canvas;
  });
});
