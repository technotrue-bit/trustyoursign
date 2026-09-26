#!/usr/bin/env node
/**
 * Write seeds/private/joey.json and saige.json from the TypeScript books.
 *
 * Those modules are no longer in the tracked tree. Run this from a checkout
 * that still has them (origin/main, or a worktree of that commit) BEFORE
 * merging the relocation:
 *
 *   git worktree add /tmp/tys-charts origin/main
 *   git -C /tmp/tys-charts checkout origin/main -- scripts/export-research-nativities.mjs
 *   # if the script is only on the PR branch, copy this file into the worktree
 *   cd /tmp/tys-charts && npx tsx scripts/export-research-nativities.mjs
 *
 * Output is gitignored. This script does not print chart contents.
 * When the modules are already gone it exits 2 and writes nothing.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const natDir = join(root, "src/lib/chart/nativities");
const joeyPath = join(natDir, "joey.ts");
const saigePath = join(natDir, "saige.ts");

if (!existsSync(joeyPath) || !existsSync(saigePath)) {
  console.error("[export-research-nativities] joey.ts / saige.ts are not in this tree.");
  console.error("Run from a checkout that still has the books (origin/main) before merging.");
  console.error("See docs/security/research-nativities.md. Nothing was written.");
  process.exit(2);
}

const [{ JOEY }, { SAIGE }] = await Promise.all([
  import(pathToFileURL(joeyPath).href),
  import(pathToFileURL(saigePath).href),
]);

const outDir = join(root, "seeds", "private");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "joey.json"), JSON.stringify(JOEY));
writeFileSync(join(outDir, "saige.json"), JSON.stringify(SAIGE));
console.log("[export-research-nativities] wrote seeds/private/joey.json and saige.json");
console.log("[export-research-nativities] confirm git status does not show those files");
