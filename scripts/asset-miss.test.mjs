import assert from "node:assert/strict";
import test from "node:test";
import { assetMissResponse, isHashedAssetMiss } from "./asset-miss.mjs";

test("only hashed asset paths are misses", () => {
  assert.equal(isHashedAssetMiss("/assets/FallbackSky-C-XEYyDi.js"), true);
  assert.equal(isHashedAssetMiss("/assets/nebulaBackdrop-63nkv-R1.js"), true);
  assert.equal(isHashedAssetMiss("/"), false);
  assert.equal(isHashedAssetMiss("/api/auth/get-session"), false);
  assert.equal(isHashedAssetMiss("/assets/"), false);
});

test("miss response is an uncached 404, not the app document", async () => {
  const response = assetMissResponse();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(await response.text(), "Not found");
});
