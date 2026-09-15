/**
 * Decide whether a bright line in the landed frame belongs to the WebGL canvas
 * or the DOM overlay: land on a sign, shoot the frame, hide the canvas, shoot again.
 *
 *   node scripts/qa/line-source.mjs [signIndex]
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const signIndex = Number(process.argv[2] ?? 6); // 6 = libra
const outDir = `screenshots/line-${signIndex}`;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 30_000 });
await page.waitForTimeout(1200);
const parked = await page.evaluate((i) => {
  window.__tysQa.ready();
  return window.__tysQa.parkAt(i);
}, signIndex);
await page
  .waitForFunction((w) => Math.abs(window.__tysQa.state().t - w) < 0.005, parked.target, { timeout: 8000 })
  .catch(() => {});
await page.evaluate((i) => window.__tysQa.enter(i), signIndex);
await page.waitForFunction(() => window.__tysQa.state().phase === "inside", null, { timeout: 14_000 });
await page.waitForTimeout(1500);

const probe = await page.evaluate(() => window.__tysQa.state().probe);
await page.screenshot({ path: `${outDir}/full.png` });
await page.evaluate(() => {
  document.querySelectorAll("canvas").forEach((c) => {
    c.style.visibility = "hidden";
  });
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/no-canvas.png` });
console.log(JSON.stringify({ probe, out: outDir }, null, 2));
await browser.close();