import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeNatalCast, localToUtc } from "../src/lib/chart/ephemeris.ts";
import { buildVisitorNativity } from "../src/lib/chart/visitor-nativity.ts";
import { answerFromBones } from "../src/lib/chart/bones-ask.ts";
import type { Nativity } from "../src/lib/chart/schema.ts";

const q = "what about the music choices I choose, how does that work with my sign?";

const utc = localToUtc(2000, 1, 1, 12, 0, "America/New_York");
const visitor = buildVisitorNativity(
  await computeNatalCast(utc, {
    name: "Sample",
    lat: 40.71,
    lon: -74.0,
    timeZone: "America/New_York",
  }),
  {
    label: "Visitor natal",
    when: "1 Jan 2000 · 12:00 pm",
    dateLabel: "1 Jan 2000",
    timeLabel: "12:00 pm",
  },
);

process.stdout.write("VISITOR ASK\n");
process.stdout.write(answerFromBones(visitor, q) + "\n");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const id of ["joey", "saige"] as const) {
  const path = join(root, "seeds", "private", `${id}.json`);
  if (!existsSync(path)) {
    process.stdout.write(`\n--- ${id} skipped (no seeds/private/${id}.json) ---\n`);
    continue;
  }
  const book = JSON.parse(readFileSync(path, "utf8")) as Nativity;
  process.stdout.write(`\n--- ${id} ASK ---\n`);
  process.stdout.write(answerFromBones(book, q) + "\n");
}
