import assert from "node:assert/strict";
import test from "node:test";
import { patchVercelAssetMiss } from "./patch-vercel-asset-miss.mjs";

test("asset misses 404 after filesystem and do not inherit the immutable header", () => {
  const patched = patchVercelAssetMiss({
    version: 3,
    routes: [
      {
        src: "/assets/(.*)",
        headers: { "cache-control": "public,max-age=31536000,immutable" },
        continue: true,
      },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/__server" },
    ],
  });
  const routes = patched.routes;
  const fsAt = routes.findIndex((route) => route.handle === "filesystem");
  const miss = routes[fsAt + 1];
  assert.equal(miss.src, "/assets/(.*)");
  assert.equal(miss.status, 404);
  assert.equal(miss.headers["cache-control"], "no-store");
  assert.equal(miss.dest, undefined);
  assert.ok(fsAt < routes.findIndex((route) => route.dest === "/__server"));
  assert.equal(
    routes[0].headers["cache-control"],
    "public,max-age=31536000,immutable",
  );
});

test("re-patching does not stack miss routes", () => {
  const once = patchVercelAssetMiss({
    routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/__server" }],
  });
  const twice = patchVercelAssetMiss(once);
  const misses = twice.routes.filter((route) => route.status === 404);
  assert.equal(misses.length, 1);
});
