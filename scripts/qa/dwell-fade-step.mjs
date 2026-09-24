/**
 * Step dwellBlend on frame 0 (VideoTexture, paused) — ~200ms crossfade evidence.
 *   node scripts/qa/dwell-fade-step.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";
const outDir =
  "/cursor/stores/bc-94162dc9-7018-48da-a5a0-9bf7e81bd591/media/dwell-clip";
const blends = [0, 0.25, 0.5, 0.75, 1];

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});

async function capture(label, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.__tysQa?.dwellRamSplitB));
  await page.evaluate(() => {
    window.__tysQa.ready();
    window.__tysQa.preload("aries");
  });
  await page.waitForTimeout(5000);
  await page.locator("button", { hasText: /^OK$/ }).first().click({ timeout: 2000 }).catch(() => {});

  for (const b of blends) {
    await page.evaluate(async (blend) => {
      window.__tysQa.clearDwellRamSplit();
      await window.__tysQa.dwellRamQaHold({ blend, videoTime: 0, playing: false });
    }, b);
    await page.waitForFunction(
      () => window.__tysQa.state().seek == null && Math.abs(window.__tysQa.state().t) < 0.012,
      { timeout: 30_000 },
    );
    const tag = String(b).replace(".", "");
    await page.screenshot({
      path: join(outDir, `aries-fade-blend${tag}-${label}.png`),
      type: "png",
    });
  }
  await page.close();
}

await mkdir(outDir, { recursive: true });
await capture("phone", { width: 390, height: 844 });
await capture("desktop", { width: 1280, height: 800 });
await browser.close();
console.log("wrote fade step PNGs");
