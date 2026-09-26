import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { gitignoreCoversPrivateSeeds, planResearchSeed } from "./research-nativity-seed.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("private seed directory is gitignored", () => {
  const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
  assert.equal(gitignoreCoversPrivateSeeds(gitignore), true);
});

test("plans joey and saige json and refuses anything else", () => {
  const planned = planResearchSeed([
    { name: "joey.json", text: JSON.stringify({ id: "joey", meta: { name: "fixture" } }) },
    { name: "notes.txt", text: "ignore" },
    { name: "saige.json", text: JSON.stringify({ id: "saige", meta: { name: "fixture" } }) },
  ]);
  assert.deepEqual(
    planned.map((row) => row.id),
    ["joey", "saige"],
  );
  assert.throws(() => planResearchSeed([{ name: "other.json", text: '{"id":"other"}' }]));
  assert.throws(() => planResearchSeed([{ name: "joey.json", text: '{"id":"saige"}' }]));
  assert.throws(() => planResearchSeed([]));
});

test("exporter writes nothing once the books are untracked", () => {
  const run = spawnSync(process.execPath, [join(root, "scripts/export-research-nativities.mjs")], {
    encoding: "utf8",
  });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /not in this tree/);
});

test("migration does not embed a natal payload", () => {
  const sql = readFileSync(join(root, "migrations/0011_research_nativity.sql"), "utf8");
  assert.match(sql, /create table if not exists research_nativity/);
  assert.match(sql, /force row level security/);
  assert.equal(sql.includes("insert into research_nativity"), false);
});
