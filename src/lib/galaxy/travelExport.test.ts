import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const TRAVEL_TS = fileURLToPath(new URL("./travel.ts", import.meta.url));

/** Count locked on main after #183. A new shared helper raises this in review. */
const EXPORT_LINES_AFTER_183 = 86;

function linesThatBeginWithExport(source: string): number {
  return source.split(/\r?\n/).filter((line) => line.startsWith("export")).length;
}

describe("travel export census", () => {
  it("stays at the shared-helper count from the privacy shrink", () => {
    const count = linesThatBeginWithExport(readFileSync(TRAVEL_TS, "utf8"));
    assert.equal(
      count,
      EXPORT_LINES_AFTER_183,
      `travel.ts has ${count} lines that begin with \`export\`; expected ${EXPORT_LINES_AFTER_183}. Raise the number only in a reviewed pull request that names the new caller.`,
    );
  });
});
