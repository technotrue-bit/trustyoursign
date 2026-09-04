#!/usr/bin/env node
/**
 * Nitro/Vercel bundles `@electric-sql/pglite` as `_libs/electric-sql__pglite.mjs`
 * but does not copy the sibling WASM/data payloads. `vite preview` then crashes
 * with ENOENT. Copy every asset the bundle references next to it after build.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, ".vercel/output/functions/__server.func/_libs");
const SRC = join(ROOT, "node_modules/@electric-sql/pglite/dist");

/** Real files in dist → optional aliases the bundle may locateFile() as. */
const COPIES = [
  { from: "pglite.data", to: "pglite.data" },
  { from: "pglite.data", to: "datafile_pglite.data" },
  { from: "pglite.wasm", to: "pglite.wasm" },
  { from: "initdb.wasm", to: "initdb.wasm" },
];

if (!existsSync(DEST)) {
  console.log(`[copy-pglite-assets] skip — no Nitro output at ${DEST}`);
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });
for (const { from, to } of COPIES) {
  const src = join(SRC, from);
  const dest = join(DEST, to);
  if (!existsSync(src)) {
    console.error(`[copy-pglite-assets] missing source ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  console.log(`[copy-pglite-assets] ${to}`);
}
