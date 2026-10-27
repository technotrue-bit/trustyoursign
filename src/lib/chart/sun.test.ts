import assert from "node:assert/strict";
import test from "node:test";
import { isCuspDate, sunSignOn } from "./sun.ts";

test("a date in the middle of a sign is not a cusp", () => {
  assert.equal(sunSignOn(2, 29), "pisces");
  assert.equal(isCuspDate(2, 29), false);
  assert.equal(isCuspDate(8, 5), false);
});

test("the two days either side of a sign change are cusps", () => {
  assert.equal(isCuspDate(10, 22), true);
  assert.equal(isCuspDate(10, 23), true);
  assert.equal(isCuspDate(10, 21), true);
  assert.equal(isCuspDate(10, 24), true);
  assert.equal(isCuspDate(10, 25), false);
  assert.equal(isCuspDate(10, 20), false);
});

test("cusps wrap across the new year", () => {
  assert.equal(isCuspDate(12, 21), true);
  assert.equal(isCuspDate(12, 22), true);
  assert.equal(isCuspDate(1, 19), true);
  assert.equal(isCuspDate(1, 20), true);
});
