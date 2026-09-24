/**
 * Paused Aries plate compares: still vs life frame 0 vs last frame.
 *
 *   node scripts/qa/dwell-plate-compare.mjs [outDir]
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";
const outDir =
  process.argv[2] ??
  "/cursor/stores/bc-94162dc9-7018-48da-a5a0-9bf7e81bd591/media/dwell-clip";

async function ramDiff(aPath, bPath, cropFrac = 0.42) {
  const meta = await sharp(aPath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const cw = Math.round(w * cropFrac);
  const ch = Math.round(h * cropFrac);
  const left = Math.round((w - cw) / 2);
  const top = Math.round((h - ch) / 2);
  const crop = { left, top, width: cw, height: ch };
  const rawA = await sharp(aPath).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rawB = await sharp(bPath).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let moved = 0;
  let maxDelta = 0;
  const px = rawA.info.width * rawA.info.height;
  for (let i = 0; i < rawA.data.length; i += 4) {
    const d = Math.max(
      Math.abs(rawA.data[i] - rawB.data[i]),
      Math.abs(rawA.data[i + 1] - rawB.data[i + 1]),
      Math.abs(rawA.data[i + 2] - rawB.data[i + 2]),
    );
    sum += d;
    if (d > 30) moved++;
    if (d > maxDelta) maxDelta = d;
  }
  return {
    meanDelta: px ? sum / px : 0,
    movedOver30: moved,
    movedFraction: px ? moved / px : 0,
    maxDelta,
    crop,
  };
}

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});

async function captureViewport(label, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.__tysQa?.dwellPlateShot), null, {
    timeout: 60_000,
  });
  await page.evaluate(() => {
    window.__tysQa.ready();
    window.__tysQa.preload("aries");
  });
  await page.waitForTimeout(6000);
  await page.locator("button", { hasText: /^OK$/ }).first().click({ timeout: 2000 }).catch(() => {});

  async function settleAndShot(mode, file) {
    await page.evaluate(async (m) => {
      window.__tysQa.dwellPlateShot(m);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const video = document.querySelector('video[data-dwell-clip="aries"]');
      if (video && m !== "still") {
        await new Promise((resolve) => {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) resolve(undefined);
          else video.addEventListener("seeked", () => resolve(undefined), { once: true });
        });
      }
    }, mode);
    await page.waitForFunction(
      () => {
        const s = window.__tysQa.state();
        return s.seek == null && Math.abs(s.t) < 0.012;
      },
      { timeout: 30_000 },
    );
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(outDir, file), type: "png" });
    return page.evaluate(() => window.__tysQa.dwellClipFrame("aries"));
  }

  const stillPath = `aries-still-${label}.png`;
  const frame0Path = `aries-frame0-${label}.png`;
  const lastPath = `aries-last-${label}.png`;

  const stillMeta = await settleAndShot("still", stillPath);
  const frame0Meta = await settleAndShot("life0", frame0Path);
  const lastMeta = await settleAndShot("lifeLast", lastPath);

  await page.evaluate(() => window.__tysQa.clearDwellPlateShot());
  await page.close();

  const frame0VsStill = await ramDiff(join(outDir, frame0Path), join(outDir, stillPath));
  const lastVsStill = await ramDiff(join(outDir, lastPath), join(outDir, stillPath));

  return { label, stillMeta, frame0Meta, lastMeta, frame0VsStill, lastVsStill };
}

const phone = await captureViewport("phone", { width: 390, height: 844 });
const desktop = await captureViewport("desktop", { width: 1280, height: 800 });

const report = {
  note:
    "Center crop (~42% viewport) on the ram only. Large movedFraction means frame 0 or last frame still does not match the still plate.",
  phone,
  desktop,
};

await writeFile(join(outDir, "aries-plate-compare.json"), JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
