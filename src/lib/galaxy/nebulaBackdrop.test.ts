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
  NEBULA_PLACEMENTS,
  PLATE_FADE_END,
  PLATE_FADE_START,
  STAR_FIELD,
  centerWellAlphaAt,
  composeNebulaWallpaper,
  edgeMaskAlphaAt,
  makeCenterWellData,
  makeEdgeAlphaMaskData,
  makePlateEdgeMaskData,
  nebulaCompositeSize,
  nebulaUrl,
  paintCenterVignette,
  paintPinpointStars,
  placementSize,
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
      assert.match(nebulaUrl(layer.id, false), /\/sky\/nebula-.+\.jpg$/);
      assert.match(nebulaUrl(layer.id, true), /-sm\.jpg$/);
    }
    assert.ok(NEBULA_GL_LAYER_GAIN_MODEST < NEBULA_GL_LAYER_GAIN);
    assert.ok(NEBULA_2D_LAYER_GAIN <= 0.65);
  });

  it("stamps each ref near its own resolution, never cover-fit across the bake", () => {
    for (const place of NEBULA_PLACEMENTS) {
      assert.ok(NEBULA_LAYERS[place.layer], `unknown layer ${place.layer}`);
      assert.ok(place.span > 0.1 && place.span <= 0.7, `span ${place.span} blows the ref up`);
      assert.ok(place.weight > 0 && place.weight <= 1, `weight ${place.weight}`);
      if (!place.crop) continue;
      const [x, y, w, h] = place.crop;
      assert.ok(w >= 0.4 && h >= 0.4, "crops stay wide enough to draw near 1:1");
      assert.ok(x >= 0 && y >= 0 && x + w <= 1.0001 && y + h <= 1.0001, "crop inside the ref");
    }
    // 635 px refs over a 1536 bake: the old cover-fit path magnified 4×.
    const [dw] = placementSize({ layer: 0, cx: 0.5, cy: 0.5, span: 0.7, weight: 1 }, 635, 793, 1536);
    assert.ok(dw / 635 < 2, `worst-case magnification ${(dw / 635).toFixed(2)}×`);
  });

  it("shows each showpiece object once and fills both frame shapes", () => {
    const uses = new Map<number, number>();
    for (const p of NEBULA_PLACEMENTS) uses.set(p.layer, (uses.get(p.layer) ?? 0) + 1);
    const idOf = (name: string) => NEBULA_LAYERS.findIndex((l) => l.id === name);
    for (const showpiece of ["nebula-ring", "nebula-hourglass"]) {
      const full = NEBULA_PLACEMENTS.filter((p) => p.layer === idOf(showpiece) && !p.crop);
      assert.equal(full.length, 1, `${showpiece} whole would read as tiled wallpaper`);
    }
    // A 16:10 window sees the middle band; a phone sees the middle column.
    const inBand = (p: (typeof NEBULA_PLACEMENTS)[number]) => p.cy > 0.25 && p.cy < 0.75;
    const inColumn = (p: (typeof NEBULA_PLACEMENTS)[number]) => p.cx > 0.25 && p.cx < 0.75;
    const corners = (test: (p: (typeof NEBULA_PLACEMENTS)[number]) => boolean) =>
      NEBULA_PLACEMENTS.filter((p) => test(p) && p.weight >= 0.5).length;
    assert.ok(corners(inBand) >= 4, "laptop corners land on the middle band");
    assert.ok(corners(inColumn) >= 4, "phone corners land on the middle column");
  });

  it("pinpoint stars stay small, plentiful and dim in the middle", () => {
    assert.ok(STAR_FIELD.maxRadius <= 2, "points, not orbs");
    const discs: { x: number; y: number; r: number; alpha: number }[] = [];
    let fill = "";
    const ctx = {
      save() {},
      restore() {},
      beginPath() {},
      arc(x: number, y: number, r: number) {
        const m = /rgba\([^)]*,\s*([\d.]+)\)$/.exec(fill);
        discs.push({ x, y, r, alpha: m ? Number(m[1]) : 1 });
      },
      fill() {},
      createRadialGradient: () => ({ addColorStop() {} }),
      set fillStyle(v: unknown) {
        fill = typeof v === "string" ? v : "";
      },
      set globalCompositeOperation(_v: string) {},
    };
    paintPinpointStars(ctx as unknown as CanvasRenderingContext2D, 1024);
    const points = discs.filter((d) => d.r <= STAR_FIELD.maxRadius);
    assert.ok(points.length > 400, `only ${points.length} stars on a 1024 bake`);
    const near = points.filter((d) => Math.hypot(d.x - 512, d.y - 512) < 200);
    const far = points.filter((d) => Math.hypot(d.x - 512, d.y - 512) > 430);
    const mean = (list: typeof points) =>
      list.reduce((acc, d) => acc + d.alpha, 0) / Math.max(1, list.length);
    assert.ok(mean(near) < mean(far), "middle stars must not fight the type");
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
