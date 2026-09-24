/**
 * Aries dwell cut strips + frame state log for oracle review.
 *
 *   node scripts/qa/dwell-strip-capture.mjs [outDir]
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";
const outDir =
  process.argv[2] ??
  "/cursor/stores/bc-94162dc9-7018-48da-a5a0-9bf7e81bd591/media/dwell-clip";

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});

async function dismissOk(page) {
  await page.locator("button", { hasText: /^OK$/ }).first().click({ timeout: 2000 }).catch(() => {});
}

async function boot(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.__tysQa?.dwellClipFrame), null, {
    timeout: 60_000,
  });
  await page.evaluate(() => {
    window.__tysQa.ready();
    window.__tysQa.preload("aries");
  });
  await page.waitForTimeout(6000);
  await dismissOk(page);
}

async function settleAries(page) {
  await page.evaluate(() => window.__tysQa.parkAt(0));
  await page.waitForFunction(
    () => {
      const s = window.__tysQa.state();
      return s.seek == null && Math.abs(s.t) < 0.012;
    },
    { timeout: 30_000 },
  );
}

async function frameMeta(page) {
  return page.evaluate(() => {
    const f = window.__tysQa.dwellClipFrame("aries");
    return {
      t: f.t,
      dwellClipIndex: f.dwellClipIndex,
      dwellClipDone: f.dwellClipDone,
      videoCurrentTime: f.videoCurrentTime,
      videoPaused: f.videoPaused,
      videoEnded: f.videoEnded,
    };
  });
}

async function captureStrip(page, { prefix, count, intervalMs, trigger }) {
  await trigger();
  const frames = [];
  for (let i = 0; i < count; i++) {
    const file = `${prefix}-${String(i).padStart(2, "0")}.png`;
    const meta = await frameMeta(page);
    await page.screenshot({ path: join(outDir, file), type: "png" });
    frames.push({ file, ...meta });
    if (i < count - 1) await page.waitForTimeout(intervalMs);
  }
  await writeFile(
    join(outDir, `${prefix}-frames.json`),
    JSON.stringify({ prefix, intervalMs, frames }, null, 2),
  );
  return frames;
}

async function waitClipArmed(page) {
  const start = Date.now();
  while (Date.now() - start < 20_000) {
    const idx = await page.evaluate(() => window.__tysQa.state().dwellClipIndex);
    if (idx === 0) return;
    await page.waitForTimeout(20);
  }
  throw new Error("dwellClipIndex never became 0");
}

async function waitVideoPlaying(page, minTime = 1.2) {
  const start = Date.now();
  while (Date.now() - start < 20_000) {
    const f = await frameMeta(page);
    if (
      f.dwellClipIndex === 0 &&
      !f.videoPaused &&
      f.videoCurrentTime != null &&
      f.videoCurrentTime >= minTime
    ) {
      return;
    }
    await page.waitForTimeout(40);
  }
  throw new Error("video never reached mid-play");
}

async function waitVideoEnded(page) {
  await page.waitForFunction(
    () => {
      const v = document.querySelector('video[data-dwell-clip="aries"]');
      return Boolean(v && v.ended);
    },
    { timeout: 25_000 },
  );
}

function bufferDiff(a, b) {
  if (a.length !== b.length) return { identical: false, changedPixels: a.length, maxDelta: 255 };
  let changed = 0;
  let maxDelta = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(
      Math.abs(a[i] - b[i]),
      Math.abs(a[i + 1] - b[i + 1]),
      Math.abs(a[i + 2] - b[i + 2]),
    );
    if (d > 30) changed++;
    if (d > maxDelta) maxDelta = d;
  }
  const totalPx = a.length / 4;
  return { identical: changed === 0 && maxDelta === 0, changedPixels: changed, totalPixels: totalPx, maxDelta };
}

async function midClipMotionCheck(page, vpLabel) {
  await boot(page);
  await settleAries(page);
  await waitClipArmed(page);
  await waitVideoPlaying(page, 2);
  const a = await page.screenshot({ type: "png" });
  await page.waitForTimeout(300);
  const b = await page.screenshot({ type: "png" });
  const diff = bufferDiff(a, b);
  const report = {
    viewport: vpLabel,
    intervalMs: 300,
    ...diff,
    changedFraction: diff.changedPixels / diff.totalPixels,
    videoNotVisibleInCapture:
      diff.identical || diff.changedFraction < 0.001,
  };
  return report;
}

async function runViewport(vpLabel, viewport) {
  const page = await browser.newPage({ viewport });

  await captureStrip(page, {
    prefix: `aries-start-${vpLabel}`,
    count: 16,
    intervalMs: 50,
    trigger: async () => {
      await boot(page);
      await settleAries(page);
      await waitClipArmed(page);
    },
  });

  await captureStrip(page, {
    prefix: `aries-end-${vpLabel}`,
    count: 10,
    intervalMs: 50,
    trigger: async () => {
      await boot(page);
      await settleAries(page);
      await waitClipArmed(page);
      await waitVideoEnded(page);
    },
  });

  await captureStrip(page, {
    prefix: `aries-swipe-${vpLabel}`,
    count: 8,
    intervalMs: 50,
    trigger: async () => {
      await boot(page);
      await settleAries(page);
      await waitClipArmed(page);
      await waitVideoPlaying(page, 1.5);
      await page.evaluate(() => window.__tysQa.parkAt(1));
    },
  });

  const motion = await midClipMotionCheck(page, vpLabel);
  await page.close();
  return motion;
}

const motionPhone = await runViewport("phone", { width: 390, height: 844 });
const motionDesktop = await runViewport("desktop", { width: 1280, height: 800 });

const motionReport = {
  note:
    "If videoNotVisibleInCapture is true, two full-viewport PNGs 300ms apart in mid-clip were identical (or nearly) — the capture is not showing animated video.",
  phone: motionPhone,
  desktop: motionDesktop,
};

await writeFile(join(outDir, "mid-clip-motion-check.json"), JSON.stringify(motionReport, null, 2));

await browser.close();
console.log(JSON.stringify(motionReport, null, 2));
console.log("strips written to", outDir);
