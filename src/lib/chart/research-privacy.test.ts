import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Strings that must never appear in tracked chart source.
 * Research natal books are seeded from gitignored `seeds/private/`, not committed.
 */
const FORBIDDEN = [
  "Port Huron",
  "DeKalb",
  "Joey Devin",
  "Saige K",
  "26 July 2004",
  "13 December 1999",
  "2453213",
  "2451526",
  "Moon at 27° Scorpio",
  "Sun at 4° Leo in the 8th",
  "6:21 pm EDT",
];

const PUBLIC_FILES = [
  "signs.ts",
  "planets.ts",
  "houses.ts",
  "geometry.ts",
  "chakras.ts",
  "aspects.ts",
  "copy.ts",
  "visitor-nativity.ts",
];

describe("research natal data stays off public chart modules", () => {
  const chartDir = join(dirname(fileURLToPath(import.meta.url)));

  it("public modules do not embed Saige/Joey birth certificate strings", () => {
    const hits: string[] = [];
    for (const file of PUBLIC_FILES) {
      const text = readFileSync(join(chartDir, file), "utf8");
      for (const needle of FORBIDDEN) {
        if (text.includes(needle)) hits.push(`${file}: ${needle}`);
      }
    }
    assert.deepEqual(hits, [], `leaked research PII:\n${hits.join("\n")}`);
  });

  it("tracked nativities/ does not hold the research books", () => {
    const natDir = join(chartDir, "nativities");
    const names = readdirSync(natDir);
    assert.deepEqual(
      names.filter((name) => name.endsWith(".ts")).sort(),
      ["load.server.ts", "read.ts"],
    );
    const loader = readFileSync(join(natDir, "load.server.ts"), "utf8");
    assert.equal(loader.includes("./joey"), false);
    assert.equal(loader.includes("./saige"), false);
    assert.match(loader, /research_nativity/);
    const hits: string[] = [];
    for (const name of names) {
      const text = readFileSync(join(natDir, name), "utf8");
      for (const needle of FORBIDDEN) {
        if (text.includes(needle)) hits.push(`${name}: ${needle}`);
      }
    }
    assert.deepEqual(hits, []);
  });
});
