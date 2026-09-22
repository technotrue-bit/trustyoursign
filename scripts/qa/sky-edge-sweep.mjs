/**
 * Watch the backdrop through a full drift cycle and flag any frame where the
 * plate's rim enters the frame as a straight edge.
 *
 *   node scripts/qa/sky-edge-sweep.mjs [outDir]
 *
 * Run it with `NEBULA_COMPOSITE_DRIFT` temporarily cranked up: the shipping
 * drift takes ~26 minutes to reach its extremes.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";
const outDir = process.argv[2] ?? "screenshots/sky-edge";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 30_000 });
await page.waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 30_000 });
await page.evaluate(() => window.__tysQa.ready());
await page.waitForTimeout(3000);

for (let i = 0; i < 10; i++) {
  await page.screenshot({ path: `${outDir}/f${String(i).padStart(2, "0")}.png`, timeout: 20_000 });
  await page.waitForTimeout(700);
}
await browser.close();
console.log(`wrote 10 frames to ${outDir}`);
