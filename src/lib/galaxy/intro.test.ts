import assert from "node:assert/strict";
import test from "node:test";
import {
  ariesConstellationLineCount,
  ariesConstellationLineReveal,
  ariesConstellationReveal,
} from "./intro.ts";

test("Aries constellation reveal is hidden before the silhouette gathers", () => {
  assert.equal(ariesConstellationReveal(0), 0);
  assert.equal(ariesConstellationReveal(0.16), 0);
});

test("Aries constellation reveal eases into a complete line drawing", () => {
  assert.ok(ariesConstellationReveal(0.5) > 0);
  assert.ok(ariesConstellationReveal(0.5) < 1);
  assert.equal(ariesConstellationReveal(1), 1);
});

test("stages the early Aries lines before the late legs", () => {
  const total = 24;
  assert.ok(ariesConstellationLineReveal(0.45, 0, total) > 0);
  assert.equal(ariesConstellationLineReveal(0.45, total - 1, total), 0);
  assert.ok(ariesConstellationLineCount(0.62, total) > 0);
  assert.ok(ariesConstellationLineCount(0.62, total) < total);
  assert.equal(ariesConstellationLineCount(1, total), total);
});

test("reduced motion lands immediately on the finished constellation", () => {
  assert.equal(ariesConstellationReveal(0, true), 1);
  assert.equal(ariesConstellationReveal(0.2, true), 1);
  assert.equal(ariesConstellationLineCount(0, 24, true), 24);
  assert.equal(ariesConstellationLineReveal(0, 23, 24, true), 1);
});
