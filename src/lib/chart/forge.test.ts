import { describe, expect, it } from "vitest";
import {
  applyProseToNativity,
  birthFingerprint,
  forgeIsReady,
  mergeProseChunks,
  missingProseKeys,
} from "./forge";
import type { Nativity } from "./schema";

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
    expect(birthFingerprint(b)).toBe(birthFingerprint({ ...b }));
    expect(birthFingerprint(b)).toBe("aries|1990-4-1|14:30|austin tx");
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
    expect(birthFingerprint(base)).not.toBe(birthFingerprint({ ...base, place: "Paris" }));
    expect(birthFingerprint(base)).not.toBe(birthFingerprint({ ...base, hour: 9, minute: 0 }));
  });
});

describe("mergeProseChunks", () => {
  it("never overwrites completed keys", () => {
    const merged = mergeProseChunks({ sky: "old" }, { sky: "new", body: "body" });
    expect(merged.sky).toBe("old");
    expect(merged.body).toBe("body");
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
    expect(forgeIsReady("{}", "{}", chunks)).toBe(true);
    expect(forgeIsReady("{}", "{}", { sky: "a" })).toBe(false);
    expect(forgeIsReady(null, null, chunks)).toBe(false);
    expect(forgeIsReady("{}", "{}", { sky: "a" }, true)).toBe(true);
  });

  it("lists missing keys", () => {
    expect(missingProseKeys({ sky: "x" })).toEqual(["body", "gates", "machine", "readings", "bones"]);
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
    expect(out.meta.thesis).toContain("Forged thesis");
  });
});
