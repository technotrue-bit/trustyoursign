import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = join(root, "migrations/0014_drop_charts_pass_copies.sql");

function walkSources(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkSources(path, acc);
    else if (name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".mjs")) acc.push(path);
  }
  return acc;
}

/** Contents of `sql`...`` and `sql<...>`` templates. */
function sqlTemplates(source) {
  const out = [];
  const re = /sql(?:<[^>`]*>)?`([\s\S]*?)`/g;
  for (const match of source.matchAll(re)) out.push(match[1]);
  return out;
}

test("migration drops only the two unused columns on a saved chart", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const body = sql.replace(/--.*$/gm, "");
  const tables = [...body.matchAll(/alter table\s+(\w+)/gi)].map((match) => match[1]);
  const drops = [...body.matchAll(/drop column(?: if exists)?\s+(\w+)/gi)].map((match) => match[1]);
  assert.deepEqual(tables, ["charts", "charts"]);
  assert.deepEqual(drops.sort(), ["entitlement", "last_deep_at"]);
  assert.equal(/\bsky_pass\b/.test(body), false);
  assert.equal(/\bdrop table\b/i.test(body), false);
});

test("app sql never reads those columns off a saved chart", () => {
  const hits = [];
  for (const file of walkSources(join(root, "src"))) {
    const text = readFileSync(file, "utf8");
    for (const sql of sqlTemplates(text)) {
      const onChart = /\bcharts\b/.test(sql);
      const dropped = /\blast_deep_at\b/.test(sql) || /\bentitlement\b/.test(sql);
      if (onChart && dropped) hits.push(file.slice(root.length + 1));
    }
  }
  assert.deepEqual(hits, []);
});
