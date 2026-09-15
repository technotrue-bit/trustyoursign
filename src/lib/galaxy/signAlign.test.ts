import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MATCH_DONE,
  MATCH_HOLD,
  boxOfPoints,
  fieldFrame,
  figureMatchTransform,
  galaxyFrameScale,
  galaxyFigureBox,
  paintedFigureBox,
} from "./signAlign";
import type { SignVolume } from "./signVolume";

describe("signAlign boxes", () => {
  it("measures a point box, ignoring non-finite entries", () => {
    const box = boxOfPoints([
      { x: -2, y: 1 },
      { x: 3, y: -4 },
      { x: Number.NaN, y: 0 },
      { x: 0, y: 5 },
    ]);
    assert.deepEqual(box, { x0: -2, y0: -4, x1: 3, y1: 5 });
  });

  it("reads the painted figure box out of the alpha grid (top row = +y)", () => {
    const cols = 8;
    const rows = 4;
    const alpha = new Float32Array(cols * rows);
    // Paint a block: columns 1..5, top three rows → the upper part of the plate.
    for (let cx = 1; cx <= 5; cx++) {
      for (let cy = 0; cy < 3; cy++) alpha[cy * cols + cx] = 0.9;
    }
    const vol = { id: "sagittarius", aspect: 2, cols, rows, alpha, depth: alpha, stars: [] } as unknown as SignVolume;
    const box = paintedFigureBox(vol, 10);
    assert.ok(box, "expected a box from a 15-cell figure");
    // u = cx/(cols-1) over a 10-wide plate centred on 0; plate is 10 / aspect tall.
    assert.ok(Math.abs(box!.x0 - (1 / 7 - 0.5) * 10) < 1e-6);
    assert.ok(Math.abs(box!.x1 - (5 / 7 - 0.5) * 10) < 1e-6);
    // Rows 0..2 of 4 are the TOP of the image → +y in station space.
    assert.ok(box!.y1 > 0, `expected top rows to be positive y, got ${JSON.stringify(box)}`);
    assert.ok(Math.abs(box!.y1 - (1 - 0 / 3 - 0.5) * 5) < 1e-6);
    assert.ok(Math.abs(box!.y0 - (1 - 2 / 3 - 0.5) * 5) < 1e-6);
  });

  it("returns null when the grid has no figure", () => {
    const vol = {
      id: "aries",
      aspect: 2,
      cols: 4,
      rows: 4,
      alpha: new Float32Array(16),
      depth: new Float32Array(16),
      stars: [],
    } as unknown as SignVolume;
    assert.equal(paintedFigureBox(vol), null);
  });

  it("measures the live figure box from galaxy stars", () => {
    const box = galaxyFigureBox([
      { x: -8, y: -7, z: 0, mag: 0.5 },
      { x: 6, y: 7, z: 0, mag: 0.5 },
    ]);
    assert.deepEqual(box, { x0: -8, y0: -7, x1: 6, y1: 7 });
  });
});

describe("signAlign transform", () => {
  const field = { x0: -8, y0: -7, x1: 6, y1: 7 };
  const painted = { x0: -4, y0: -3, x1: 5, y1: 4 };

  it("maps the live box onto the painted box, centres coincident", () => {
    const m = figureMatchTransform(field, painted);
    assert.ok(m);
    const sx = m!.sx;
    const sy = m!.sy;
    assert.ok(Math.abs(sx - (5 - -4) / (6 - -8)) < 1e-9);
    assert.ok(Math.abs(sy - (4 - -3) / (7 - -7)) < 1e-9);
    // Centre of the scaled live box must land on the painted centre.
    const fcx = (field.x0 + field.x1) / 2;
    const scaledCx = sx * fcx + m!.ox;
    assert.ok(Math.abs(scaledCx - (painted.x0 + painted.x1) / 2) < 1e-6);
    const fcy = (field.y0 + field.y1) / 2;
    const scaledCy = sy * fcy + m!.oy;
    // The plate mesh sits 0.05 above the station origin; the offset folds that in.
    assert.ok(Math.abs(scaledCy - (0.05 + (painted.y0 + painted.y1) / 2)) < 1e-6);
  });

  it("rejects degenerate boxes instead of producing an insane scale", () => {
    assert.equal(figureMatchTransform({ x0: 0, y0: 0, x1: 0, y1: 0 }, painted), null);
    assert.equal(figureMatchTransform(field, { x0: 0, y0: 0, x1: 0.1, y1: 0.1 }), null);
  });

  it("fieldFrame ends exactly on the galaxy frame, so landing geometry is untouched", () => {
    const m = figureMatchTransform(field, painted)!;
    const end = fieldFrame(1, m);
    const deck = galaxyFrameScale(1);
    assert.ok(Math.abs(end.sx - deck) < 1e-9);
    assert.ok(Math.abs(end.sy - deck) < 1e-9);
    assert.ok(Math.abs(end.ox) < 1e-12);
    assert.ok(Math.abs(end.oy - 0.05) < 1e-9);
    assert.ok(Math.abs(end.oz - 0.35) < 1e-9);
    // Matches exactly while the painted figure is still on screen.
    const early = fieldFrame(MATCH_HOLD, m);
    assert.ok(Math.abs(early.sx - m.sx) < 1e-9);
    assert.ok(Math.abs(early.oy - m.oy) < 1e-9);
    // ...including depth: the live figure starts on the painted plate's plane.
    assert.ok(Math.abs(early.oz - -0.06) < 1e-9);
  });

  it("fieldFrame ramps monotonically from match to galaxy frame", () => {
    const m = figureMatchTransform(field, painted)!;
    let prev = fieldFrame(0, m).sx;
    for (let f = 0.02; f <= 1.0001; f += 0.02) {
      const v = fieldFrame(f, m).sx;
      assert.ok(v >= prev - 1e-9, `sx went backwards at form ${f.toFixed(2)}`);
      prev = v;
    }
    assert.ok(MATCH_HOLD < MATCH_DONE);
    assert.ok(Math.abs(fieldFrame(0.5, null).sx - galaxyFrameScale(0.5)) < 1e-9);
  });
});
