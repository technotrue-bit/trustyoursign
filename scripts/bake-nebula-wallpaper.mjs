#!/usr/bin/env node
/**
 * Build-time bake of the nebula sky wallpaper (see composeNebulaWallpaper).
 * Re-run when nebulaBackdrop.ts placements or sources change:
 *   node scripts/bake-nebula-wallpaper.mjs
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const skyDir = join(root, "public", "sky");
const BAKE_PORT = Number(process.env.NEBULA_BAKE_PORT ?? 8765);
const withAppEnv = join(root, "scripts", "with-app-env.mjs");

const VARIANTS = [
  { modest: false, path: "gl", gainKey: "NEBULA_GL_LAYER_GAIN" },
  { modest: true, path: "gl", gainKey: "NEBULA_GL_LAYER_GAIN_MODEST" },
  { modest: false, path: "2d", gainKey: "NEBULA_2D_LAYER_GAIN" },
  { modest: true, path: "2d", gainKey: "NEBULA_2D_LAYER_GAIN" },
];

function waitForHttp(url, ms = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      fetch(url)
        .then((r) => {
          if (r.ok) resolve();
          else if (Date.now() - start > ms) reject(new Error(`timeout waiting for ${url}`));
          else setTimeout(tick, 400);
        })
        .catch(() => {
          if (Date.now() - start > ms) reject(new Error(`timeout waiting for ${url}`));
          else setTimeout(tick, 400);
        });
    };
    tick();
  });
}

async function withDevServer(run) {
  const base = (process.env.QA_BASE ?? `http://127.0.0.1:${BAKE_PORT}`).replace(/\/$/, "");
  if (process.env.QA_BASE) {
    return run(base);
  }
  const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [withAppEnv, viteBin, "dev", "--host", "127.0.0.1", "--port", String(BAKE_PORT)],
    { cwd: root, stdio: "ignore" },
  );
  try {
    await waitForHttp(`${base}/`);
    return await run(base);
  } finally {
    child.kill("SIGTERM");
  }
}

function outName(modest, path) {
  const size = modest ? 1024 : 1536;
  const modestTag = modest ? "-modest" : "";
  return `nebula-wallpaper-${size}-${path}${modestTag}.webp`;
}

await withDevServer(async (base) => {
  await mkdir(skyDir, { recursive: true });
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  await page.goto(`${base}/__nebula-bake.html`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__nebulaMod), null, { timeout: 60_000 });

  const report = [];
  for (const variant of VARIANTS) {
    const name = outName(variant.modest, variant.path);
    const baked = await page.evaluate(async (v) => {
      const mod = window.__nebulaMod;
      const gain =
        v.gainKey === "NEBULA_GL_LAYER_GAIN"
          ? mod.NEBULA_GL_LAYER_GAIN
          : v.gainKey === "NEBULA_GL_LAYER_GAIN_MODEST"
            ? mod.NEBULA_GL_LAYER_GAIN_MODEST
            : mod.NEBULA_2D_LAYER_GAIN;
      const images = await mod.loadNebulaImages(v.modest);
      const size = mod.nebulaCompositeSize(v.modest);
      const canvas = mod.composeNebulaWallpaper(images, size, gain);
      if (!canvas) return null;
      return { dataUrl: canvas.toDataURL("image/png"), size, gain };
    }, variant);

    if (!baked?.dataUrl) throw new Error(`bake failed for ${name}`);
    const png = Buffer.from(baked.dataUrl.split(",")[1], "base64");
    const outPath = join(skyDir, name);
    await sharp(png).webp({ quality: 92, effort: 6 }).toFile(outPath);
    report.push({ name, size: baked.size, pngBytes: png.length });
  }

  const diffs = await page.evaluate(async () => {
    const mod = window.__nebulaMod;
    const rows = [];
    const checks = [
      { modest: false, path: "gl", gain: mod.NEBULA_GL_LAYER_GAIN },
      { modest: true, path: "gl", gain: mod.NEBULA_GL_LAYER_GAIN_MODEST },
      { modest: false, path: "2d", gain: mod.NEBULA_2D_LAYER_GAIN },
      { modest: true, path: "2d", gain: mod.NEBULA_2D_LAYER_GAIN },
    ];
    for (const check of checks) {
      const images = await mod.loadNebulaImages(check.modest);
      const size = mod.nebulaCompositeSize(check.modest);
      const runtime = mod.composeNebulaWallpaper(images, size, check.gain);
      const img = await mod.loadPrebakedNebulaWallpaper(check.modest, check.path);
      if (!runtime || !img) {
        rows.push({ ...check, diffPct: 100, note: "missing" });
        continue;
      }
      const probe = document.createElement("canvas");
      probe.width = size;
      probe.height = size;
      const pctx = probe.getContext("2d");
      if (!pctx) {
        rows.push({ ...check, diffPct: 100, note: "no-2d" });
        continue;
      }
      pctx.drawImage(img, 0, 0, size, size);
      const a = pctx.getImageData(0, 0, size, size).data;
      const rctx = runtime.getContext("2d");
      if (!rctx) {
        rows.push({ ...check, diffPct: 100, note: "no-runtime-ctx" });
        continue;
      }
      const b = rctx.getImageData(0, 0, size, size).data;
      let diff = 0;
      for (let i = 0; i < a.length; i += 4) {
        const d =
          Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        if (d > 25) diff++;
      }
      rows.push({ ...check, diffPct: (diff / (size * size)) * 100 });
    }
    return rows;
  });

  await browser.close();
  console.log(JSON.stringify({ report, diffs }, null, 2));
});
