#!/usr/bin/env node
/**
 * Upsert private research books into `research_nativity`.
 *
 * Reads JSON from seeds/private/ (or RESEARCH_NATIVITY_SEED_DIR). That
 * directory is gitignored. Requires DATABASE_URL. Does not print payloads.
 *
 * The table forces RLS, so the write sets app.rls_bypass inside a transaction.
 * Run after migrations. See docs/security/research-nativities.md.
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { planResearchSeed } from "./research-nativity-seed.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seedDir = process.env.RESEARCH_NATIVITY_SEED_DIR?.trim() || join(root, "seeds", "private");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("[seed-research-nativities] DATABASE_URL is not set. Nothing was written.");
  process.exit(1);
}

let names;
try {
  names = await readdir(seedDir);
} catch {
  console.error(
    `[seed-research-nativities] no private seed directory. Put joey.json and saige.json in seeds/private/ (gitignored). See docs/security/research-nativities.md`,
  );
  process.exit(1);
}

const files = [];
for (const name of names) {
  if (!name.endsWith(".json")) continue;
  files.push({ name, text: await readFile(join(seedDir, name), "utf8") });
}

let planned;
try {
  planned = planResearchSeed(files);
} catch (err) {
  console.error(`[seed-research-nativities] ${err instanceof Error ? err.message : "bad seed"}`);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("select set_config('app.rls_bypass', '1', true)");
  for (const row of planned) {
    await client.query(
      `insert into research_nativity (id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      [row.id, JSON.stringify(row.payload)],
    );
    console.log(`[seed-research-nativities] upserted ${row.id}`);
  }
  await client.query("COMMIT");
} catch (err) {
  try {
    await client.query("ROLLBACK");
  } catch {
    /* keep the original */
  }
  console.error(
    `[seed-research-nativities] write failed: ${err instanceof Error ? err.message : "error"}`,
  );
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
