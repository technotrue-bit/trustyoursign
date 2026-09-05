import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyProseToNativity,
  birthFingerprint,
  FORGE_PROSE_BATCH,
  forgeIsReady,
  mergeProseChunks,
  missingProseKeys,
  proseAdvanceBatch,
} from "./forge.ts";
import type { Nativity } from "./schema.ts";
import type { ForgeProseKey } from "./forge.ts";

describe("birthFingerprint", () => {
  it("is stable for the same birth", () => {
    const b = {
      signId: "aries" as const,
      year: 1990,
      month: 4,
      day: 1,
      hour: 14,
      minute: 30,
      place: "Austin TX",
    };
    assert.equal(birthFingerprint(b), birthFingerprint({ ...b }));
    assert.equal(birthFingerprint(b), "aries|1990-4-1|14:30|austin tx");
  });

  it("changes when place or time changes", () => {
    const base = {
      signId: "aries" as const,
      year: 1990,
      month: 4,
      day: 1,
      hour: null,
      minute: null,
      place: null,
    };
    assert.notEqual(birthFingerprint(base), birthFingerprint({ ...base, place: "Paris" }));
    assert.notEqual(birthFingerprint(base), birthFingerprint({ ...base, hour: 9, minute: 0 }));
  });
});

describe("mergeProseChunks", () => {
  it("never overwrites completed keys", () => {
    const merged = mergeProseChunks({ sky: "old" }, { sky: "new", body: "body" });
    assert.equal(merged.sky, "old");
    assert.equal(merged.body, "body");
  });
});

describe("forgeIsReady", () => {
  it("needs cast and all prose keys", () => {
    const chunks = {
      sky: "a",
      body: "b",
      gates: "c",
      machine: "d",
      readings: "e",
      bones: "f",
    };
    assert.equal(forgeIsReady("{}", "{}", chunks), true);
    assert.equal(forgeIsReady("{}", "{}", { sky: "a" }), false);
    assert.equal(forgeIsReady(null, null, chunks), false);
    assert.equal(forgeIsReady("{}", "{}", { sky: "a" }, true), true);
  });

  it("lists missing keys", () => {
    assert.deepEqual(missingProseKeys({ sky: "x" }), ["body", "gates", "machine", "readings", "bones"]);
  });
});

describe("applyProseToNativity", () => {
  it("patches thesis from sky chunk without requiring a full visitor book", () => {
    const nat = {
      meta: { thesis: "seed", oneCut: "cut" },
      chakras: [],
      gates: [],
      readings: [],
      readingById: {},
      decisionClose: "",
    } as unknown as Nativity;
    const out = applyProseToNativity(nat, { sky: "Forged thesis about the day." });
    assert.match(out.meta.thesis, /Forged thesis/);
  });
});

describe("proseAdvanceBatch", () => {
  it("bounds parallel keys to FORGE_PROSE_BATCH", () => {
    const missing: ForgeProseKey[] = ["sky", "body", "gates", "machine", "readings", "bones"];
    const batch = proseAdvanceBatch(missing);
    assert.equal(batch.length, FORGE_PROSE_BATCH);
    assert.deepEqual(batch, ["sky", "body", "gates"]);
  });

  it("returns fewer when missing is short", () => {
    assert.deepEqual(proseAdvanceBatch(["bones"]), ["bones"]);
    assert.deepEqual(proseAdvanceBatch([]), []);
  });
});
