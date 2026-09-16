import assert from "node:assert/strict";
import test from "node:test";
import { ariesConstellationReveal } from "./intro.ts";

test("Aries constellation reveal is hidden before the silhouette gathers", () => {
  assert.equal(ariesConstellationReveal(0), 0);
  assert.equal(ariesConstellationReveal(0.16), 0);
});

test("Aries constellation reveal eases into a complete line drawing", () => {
  assert.ok(ariesConstellationReveal(0.5) > 0);
  assert.ok(ariesConstellationReveal(0.5) < 1);
  assert.equal(ariesConstellationReveal(1), 1);
});

test("reduced motion lands immediately on the finished constellation", () => {
  assert.equal(ariesConstellationReveal(0, true), 1);
  assert.equal(ariesConstellationReveal(0.2, true), 1);
});
