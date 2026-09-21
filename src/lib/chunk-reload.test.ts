import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearStaleChunkReload,
  reloadOnceForStaleChunk,
  staleChunkKey,
  type ChunkReloadStorage,
} from "./chunk-reload.ts";

function memoryStorage(): ChunkReloadStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

const CHUNK_ERROR =
  "Failed to fetch dynamically imported module: https://trustyoursign.com/assets/FallbackSky-3e9-X_Bh.js";

describe("stale chunk reload", () => {
  it("recognizes the browser dynamic-import failures", () => {
    assert.equal(
      staleChunkKey(new Error(CHUNK_ERROR)),
      "https://trustyoursign.com/assets/FallbackSky-3e9-X_Bh.js",
    );
    assert.equal(
      staleChunkKey(new Error("error loading dynamically imported module: /assets/x.js")),
      "error loading dynamically imported module: /assets/x.js",
    );
    assert.ok(staleChunkKey("Importing a module script failed."));
    assert.equal(staleChunkKey(new Error("The 3D sky could not load here")), null);
  });

  it("reloads once for a missing chunk, then stops", () => {
    const storage = memoryStorage();
    const reloads: number[] = [];
    const deps = { storage, reload: () => reloads.push(1) };
    assert.equal(reloadOnceForStaleChunk(new Error(CHUNK_ERROR), deps), true);
    assert.equal(reloadOnceForStaleChunk(new Error(CHUNK_ERROR), deps), false);
    assert.deepEqual(reloads, [1]);
  });

  it("does not reload ordinary sky errors", () => {
    const storage = memoryStorage();
    const reloads: number[] = [];
    assert.equal(
      reloadOnceForStaleChunk(new Error("something else broke"), {
        storage,
        reload: () => reloads.push(1),
      }),
      false,
    );
    assert.deepEqual(reloads, []);
    assert.equal(storage.map.size, 0);
  });

  it("allows another reload after the sky has committed", () => {
    const storage = memoryStorage();
    const reloads: number[] = [];
    const deps = { storage, reload: () => reloads.push(1) };
    reloadOnceForStaleChunk(new Error(CHUNK_ERROR), deps);
    clearStaleChunkReload(storage);
    assert.equal(reloadOnceForStaleChunk(new Error(CHUNK_ERROR), deps), true);
    assert.deepEqual(reloads, [1, 1]);
  });
});
