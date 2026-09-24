/**
 * A/B/C ram-mask split: HTMLVideo vs WebGL paused vs WebGL playing (~55ms).
 *
 *   node scripts/qa/dwell-ram-split.mjs [outDir]
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";
const outDir =
  process.argv[2] ??
  "/cursor/stores/bc-94162dc9-7018-48da-a5a0-9bf7e81bd591/media/dwell-clip";

const NUDGE = { x: 12, y: 16 };
const PLATE_REF = { w: 1024, h: 576 };

async function loadRgba(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function lumaAt(data, w, x, y) {
  const i = (y * w + x) * 4;
  return Math.max(data[i], data[i + 1], data[i + 2]);
}

/** Hot ram mask: still luminance > 50 (viewport space). */
function hotRamMask(still) {
  const points = [];
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < still.h; y++) {
    for (let x = 0; x < still.w; x++) {
      const l = lumaAt(still.data, still.w, x, y);
      if (l > 50) {
        points.push({ x, y, l });
        sx += x;
        sy += y;
      }
    }
  }
  const n = points.length || 1;
  return {
    points,
    count: points.length,
    centroid: { x: sx / n, y: sy / n },
  };
}

function maskBBox(mask) {
  if (!mask.count) return { left: 0, top: 0, width: 1, height: 1 };
  let minX = mask.points[0].x;
  let minY = mask.points[0].y;
  let maxX = minX;
  let maxY = minY;
  for (const p of mask.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function hotRamMaskVideo(video) {
  const points = [];
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < video.h; y++) {
    for (let x = 0; x < video.w; x++) {
      const l = lumaAt(video.data, video.w, x, y);
      if (l > 50) {
        points.push({ x, y, l });
        sx += x;
        sy += y;
      }
    }
  }
  const n = points.length || 1;
  const mean = points.length ? points.reduce((s, p) => s + p.l, 0) / points.length : null;
  return {
    points,
    count: points.length,
    centroid: { x: sx / n, y: sy / n },
    mean,
  };
}

function meanOnMaskVideo(video, mask) {
  if (!mask.count) return null;
  let sum = 0;
  for (const p of mask.points) sum += lumaAt(video.data, video.w, p.x, p.y);
  return sum / mask.count;
}

function madMaskVideo(a, b, mask) {
  if (!mask.count) return null;
  let sum = 0;
  for (const p of mask.points) {
    sum += Math.abs(lumaAt(a.data, a.w, p.x, p.y) - lumaAt(b.data, b.w, p.x, p.y));
  }
  return sum / mask.count;
}

function meanOnMask(view, mask) {
  if (!mask.count) return null;
  let sum = 0;
  for (const p of mask.points) sum += lumaAt(view.data, view.w, p.x, p.y);
  return sum / mask.count;
}

function madOnMask(a, b, mask) {
  if (!mask.count) return null;
  let sum = 0;
  for (const p of mask.points) {
    const la = lumaAt(a.data, a.w, p.x, p.y);
    const lb = lumaAt(b.data, b.w, p.x, p.y);
    sum += Math.abs(la - lb);
  }
  return sum / mask.count;
}

/** Map viewport mask point → video pixel (inverse plate UV + nudge). */
function videoLumaAt(video, bbox, vx, vy) {
  const u = (vx - bbox.left) / Math.max(1, bbox.width);
  const v = (vy - bbox.top) / Math.max(1, bbox.height);
  const tu = u - NUDGE.x / PLATE_REF.w;
  const tv = v - NUDGE.y / PLATE_REF.h;
  const px = Math.min(video.w - 1, Math.max(0, Math.floor(tu * video.w)));
  const py = Math.min(video.h - 1, Math.max(0, Math.floor((1 - tv) * video.h)));
  return lumaAt(video.data, video.w, px, py);
}

function meanVideoOnMask(video, bbox, mask) {
  if (!mask.count) return null;
  let sum = 0;
  for (const p of mask.points) sum += videoLumaAt(video, bbox, p.x, p.y);
  return sum / mask.count;
}

function madStillVideo(still, video, bbox, mask) {
  if (!mask.count) return null;
  let sum = 0;
  for (const p of mask.points) {
    const ls = lumaAt(still.data, still.w, p.x, p.y);
    const lv = videoLumaAt(video, bbox, p.x, p.y);
    sum += Math.abs(ls - lv);
  }
  return sum / mask.count;
}

async function settle(page) {
  await page.waitForFunction(
    () => {
      const s = window.__tysQa.state();
      return s.seek == null && Math.abs(s.t) < 0.012;
    },
    { timeout: 45_000 },
  );
  await page.waitForTimeout(400);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function captureViewport(label, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.__tysQa?.dwellRamSplitB), null, { timeout: 60_000 });
  await page.evaluate(() => {
    window.__tysQa.ready();
    window.__tysQa.preload("aries");
  });
  await page.waitForTimeout(5000);
  await page.locator("button", { hasText: /^OK$/ }).first().click({ timeout: 2000 }).catch(() => {});

  await page.evaluate(() => window.__tysQa.dwellRamStill());
  await settle(page);
  const stillPath = join(outDir, `aries-ram-still-${label}.png`);
  await page.screenshot({ path: stillPath, type: "png" });
  const still = await loadRgba(stillPath);
  const mask = hotRamMask(still);
  const bbox = maskBBox(mask);

  const aEval = await page.evaluate(async () => window.__tysQa.dwellRamSplitA());
  if (aEval.error) throw new Error(`A ${label}: ${aEval.error}`);
  const aPath = join(outDir, `aries-ram-A-${label}.png`);
  const aBuf = Buffer.from(aEval.dataUrl.split(",")[1], "base64");
  await writeFile(aPath, aBuf);
  const videoA = await loadRgba(aPath);
  const videoRam = hotRamMaskVideo(videoA);

  await page.evaluate(async () => window.__tysQa.dwellRamSplitB());
  await settle(page);
  const bPath = join(outDir, `aries-ram-B-${label}.png`);
  await page.screenshot({ path: bPath, type: "png" });
  const b = await loadRgba(bPath);

  const cEval = await page.evaluate(async () => window.__tysQa.dwellRamSplitC());
  if (cEval.error) throw new Error(`C ${label}: ${cEval.error}`);
  const pick =
    cEval.shots.find((s) => s.ms >= 8 && s.ms <= 50 && !s.paused) ?? cEval.shots[cEval.shots.length - 1];
  const cPath = join(outDir, `aries-ram-C-${label}.png`);
  const cBuf = Buffer.from(pick.dataUrl.split(",")[1], "base64");
  await writeFile(cPath, cBuf);
  const c = await loadRgba(cPath);

  await page.evaluate(() => window.__tysQa.clearDwellRamSplit());
  await page.close();

  const stillMean = meanOnMask(still, mask);
  const stats = {
    label,
    viewport,
    mask: { count: mask.count, centroid: mask.centroid },
    plateBBox: bbox,
    stillMean,
    A: {
      meanOnMaskMapped: meanVideoOnMask(videoA, bbox, mask),
      madVsStillMapped: madStillVideo(still, videoA, bbox, mask),
      videoHotRam: {
        count: videoRam.count,
        centroid: videoRam.centroid,
        mean: meanOnMaskVideo(videoA, videoRam),
      },
      videoSize: { w: videoA.w, h: videoA.h },
    },
    B: {
      meanOnMask: meanOnMask(b, mask),
      madVsStill: madOnMask(still, b, mask),
    },
    C: {
      meanOnMask: meanOnMask(c, mask),
      madVsStill: madOnMask(still, c, mask),
      sampleMs: pick.ms,
      videoTime: pick.videoTime,
      paused: pick.paused,
    },
  };
  return stats;
}

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});

await mkdir(outDir, { recursive: true });

const phone = await captureViewport("phone", { width: 390, height: 844 });
const desktop = await captureViewport("desktop", { width: 1280, height: 800 });

const report = {
  method:
    "Hot ram mask = still viewport pixels with luma>50. A = drawImage(video@0) mapped through plate bbox + UV nudge. B = WebGL dwellBlendQa=1 paused. C = WebGL playing, first ~50ms canvas sample.",
  phone,
  desktop,
};

await writeFile(join(outDir, "aries-ram-split.json"), JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
