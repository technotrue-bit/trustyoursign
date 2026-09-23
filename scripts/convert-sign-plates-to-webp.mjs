#!/usr/bin/env node
/**
 * One-off (re-runnable) conversion of the 12 sign plate PNGs to WebP.
 *
 * The plates are painted illustrations with soft gradients and transparency —
 * not photos — so a high-quality lossy WebP (q=92) is visually indistinguishable
 * at the sizes they're actually displayed (canvas-textured at 512–1024px wide)
 * while cutting bytes by roughly 70-85% versus the source PNG. Run again if the
 * source PNGs ever change: `node scripts/convert-sign-plates-to-webp.mjs`.
 */
import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SIGNS_DIR = fileURLToPath(new URL("../public/signs/", import.meta.url));

async function main() {
  const files = await readdir(SIGNS_DIR);
  const pngs = files.filter((f) => extname(f).toLowerCase() === ".png");
  if (pngs.length === 0) {
    console.log("convert-sign-plates-to-webp: no PNGs found in public/signs/");
    return;
  }
  for (const file of pngs) {
    const src = join(SIGNS_DIR, file);
    const outName = file.replace(/\.png$/i, ".webp");
    const out = join(SIGNS_DIR, outName);
    const before = (await stat(src)).size;
    await sharp(src).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(out);
    const after = (await stat(out)).size;
    console.log(
      `${file} -> ${outName}  ${(before / 1024).toFixed(0)}KiB -> ${(after / 1024).toFixed(0)}KiB`,
    );
  }
}

await main();
