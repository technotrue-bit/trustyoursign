#!/usr/bin/env node
/**
 * Re-encode the 12 sign plate PNGs to WebP.
 *
 * Masters live in assets/sign-plates/ so a deploy does not ship them. The
 * paintings visitors see are the WebPs written to public/signs/.
 *
 * The plates are painted illustrations with soft gradients and transparency —
 * not photos — so a high-quality lossy WebP (q=92) is visually indistinguishable
 * at the sizes they're actually displayed (canvas-textured at 512–1024px wide)
 * while cutting bytes by roughly 70-85% versus the source PNG.
 *
 *   node scripts/convert-sign-plates-to-webp.mjs --check
 *   node scripts/convert-sign-plates-to-webp.mjs
 */
import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLATE_DIR = fileURLToPath(new URL("../assets/sign-plates/", import.meta.url));
const OUT_DIR = fileURLToPath(new URL("../public/signs/", import.meta.url));
const EXPECTED_SOURCES = 12;

async function listPngs() {
  const files = await readdir(PLATE_DIR);
  return files.filter((f) => extname(f).toLowerCase() === ".png").sort();
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const pngs = await listPngs();
  if (pngs.length === 0) {
    console.log("convert-sign-plates-to-webp: no PNGs found in assets/sign-plates/");
    process.exitCode = 1;
    return;
  }
  if (checkOnly) {
    console.log(`convert-sign-plates-to-webp: ${pngs.length} sources in assets/sign-plates/`);
    for (const file of pngs) console.log(file);
    if (pngs.length !== EXPECTED_SOURCES) {
      console.error(`expected ${EXPECTED_SOURCES} sign plate PNGs, found ${pngs.length}`);
      process.exitCode = 1;
    }
    return;
  }
  const { default: sharp } = await import("sharp");
  for (const file of pngs) {
    const src = join(PLATE_DIR, file);
    const outName = file.replace(/\.png$/i, ".webp");
    const out = join(OUT_DIR, outName);
    const before = (await stat(src)).size;
    await sharp(src).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(out);
    const after = (await stat(out)).size;
    console.log(
      `${file} -> public/signs/${outName}  ${(before / 1024).toFixed(0)}KiB -> ${(after / 1024).toFixed(0)}KiB`,
    );
  }
}

await main();
