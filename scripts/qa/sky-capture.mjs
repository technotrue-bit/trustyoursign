/**
 * Capture the resting home sky (backdrop + corner galaxies) at desktop and
 * phone size, plus how long the wallpaper bake takes.
 *
 *   node scripts/qa/sky-capture.mjs [outDir]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";
const outDir = process.argv[2] ?? "screenshots/sky";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const views = [
  { name: "desktop", width: 1280, height: 800, scale: 1 },
  { name: "mobile", width: 390, height: 844, scale: 2 },
  { name: "flat", width: 1280, height: 800, scale: 1, reducedMotion: "reduce" },
];

const report = {};
for (const view of views) {
  const page = await browser.newPage({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: view.scale,
    isMobile: view.name === "mobile",
    hasTouch: view.name === "mobile",
    reducedMotion: view.reducedMotion,
  });
  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`[error] ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message.slice(0, 300)}`));
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 30_000 }).catch(() => {});
  await page.waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => window.__tysQa?.ready());
  await page.waitForTimeout(4000);
  const shot = await page
    .screenshot({ path: `${outDir}/${view.name}.png`, timeout: 20_000, animations: "allow" })
    .then(() => true)
    .catch((err) => {
      problems.push(`[screenshot] ${err.message.slice(0, 120)}`);
      return false;
    });
  if (!shot) {
    // Reduced-motion runs keep a CSS animation alive and stall page.screenshot;
    // the 2D sky is a canvas, so read it straight off instead.
    const url = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      try {
        return canvas ? canvas.toDataURL("image/png") : null;
      } catch {
        return null;
      }
    });
    if (url) {
      await writeFile(`${outDir}/${view.name}.png`, Buffer.from(url.split(",")[1], "base64"));
    }
  }

  // Time a wallpaper bake on both profiles: headless is always a software GPU,
  // so the full-size path never runs on its own here.
  const bakes = await page.evaluate(async () => {
    const mod = await import("/src/lib/galaxy/nebulaBackdrop.ts");
    const out = [];
    for (const modest of [true, false]) {
      const images = await mod.loadNebulaImages(modest);
      const size = mod.nebulaCompositeSize(modest);
      const t0 = performance.now();
      const canvas = mod.composeNebulaWallpaper(images, size, mod.NEBULA_GL_LAYER_GAIN);
      const ms = Math.round(performance.now() - t0);
      out.push({
        modest,
        size,
        ms,
        ok: Boolean(canvas),
        dataUrl: canvas ? canvas.toDataURL("image/png") : null,
      });
    }
    return out;
  });
  for (const bake of bakes) {
    if (!bake.dataUrl) continue;
    await writeFile(
      `${outDir}/${view.name}-bake-${bake.size}.png`,
      Buffer.from(bake.dataUrl.split(",")[1], "base64"),
    );
    delete bake.dataUrl;
  }
  report[view.name] = { bakes, problems };
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
