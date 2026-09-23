import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sky = join(root, "public", "sky");
const FILES = [
  "nebula-wallpaper-1536-gl.webp",
  "nebula-wallpaper-1024-gl-modest.webp",
  "nebula-wallpaper-1536-2d.webp",
  "nebula-wallpaper-1024-2d-modest.webp",
];

test("prebaked nebula wallpaper assets are present", async () => {
  for (const name of FILES) {
    const st = await stat(join(sky, name));
    assert.ok(st.size > 10_000, `${name} too small (${st.size} bytes)`);
  }
});
