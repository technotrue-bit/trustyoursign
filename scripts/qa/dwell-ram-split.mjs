/**
 * A/B/C on bright-ram mask inside detected plate bbox (not full viewport).
 *
 *   node scripts/qa/dwell-ram-split.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";
const outDir =
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

/** Centered ~16:9 corridor plate — not full viewport; area capped below 38% of screen. */
function detectPlateBBox(still, targetAspect = PLATE_REF.w / PLATE_REF.h) {
  const { data, w, h } = still;
  const maxArea = w * h * 0.38;
  const minAreaFrac = w < 500 ? 0.24 : 0.12;
  const minPwFrac = w < 500 ? 0.88 : 0.45;
  let best = null;
  const phMin = Math.floor(h * 0.18);
  const phMax = Math.floor(h * 0.5);
  for (let ph = phMin; ph <= phMax; ph += 2) {
    const pw = Math.round(ph * targetAspect);
    if (pw > w || pw < w * minPwFrac) continue;
    const area = pw * ph;
    if (area > maxArea || area / (w * h) < minAreaFrac) continue;
    const left = Math.floor((w - pw) / 2);
    const topMin = w < 500 ? Math.floor(h * 0.08) : Math.floor(h * 0.05);
    const topMax = Math.floor(h * 0.45);
    for (let top = topMin; top <= topMax; top += 2) {
      if (top + ph > h * 0.78) break;
      let art = 0;
      let dark = 0;
      const total = pw * ph;
      for (let y = top; y < top + ph; y++) {
        for (let x = left; x < left + pw; x++) {
          const l = lumaAt(data, w, x, y);
          if (l <= 22) dark++;
          if (l >= 42 && l <= 235) art++;
        }
      }
      const artFrac = art / total;
      const darkFrac = dark / total;
      if (artFrac < 0.14 || artFrac > 0.52) continue;
      const areaFrac = area / (w * h);
      const score = artFrac * Math.sqrt(areaFrac) + darkFrac * 0.12;
      if (!best || score > best.score) {
        best = { left, top, width: pw, height: ph, score, artFrac, darkFrac, areaFrac };
      }
    }
  }
  return best;
}

function inPlate(x, y, plate) {
  return (
    x >= plate.left &&
    y >= plate.top &&
    x < plate.left + plate.width &&
    y < plate.top + plate.height
  );
}

/** Bright ram figure: largest 8-connected luma blob in plate (excludes title band). */
function ramMask(still, plate) {
  const cx0 = plate.left + plate.width * 0.15;
  const cx1 = plate.left + plate.width * 0.85;
  const cy0 = plate.top + plate.height * 0.25;
  const cy1 = plate.top + plate.height * 0.92;

  const largestComponent = (t) => {
    const eligible = new Set();
    const pixels = [];
    for (let y = Math.floor(cy0); y < Math.ceil(cy1); y++) {
      for (let x = Math.floor(cx0); x < Math.ceil(cx1); x++) {
        const l = lumaAt(still.data, still.w, x, y);
        if (l <= t || l > 245) continue;
        const id = y * still.w + x;
        eligible.add(id);
        pixels.push({ x, y, id });
      }
    }
    const seen = new Set();
    let best = null;
    for (const p of pixels) {
      if (seen.has(p.id)) continue;
      const comp = [];
      const q = [p];
      seen.add(p.id);
      while (q.length) {
        const { x, y } = q.pop();
        comp.push({ x, y });
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            const nid = ny * still.w + nx;
            if (!eligible.has(nid) || seen.has(nid)) continue;
            seen.add(nid);
            q.push({ x: nx, y: ny, id: nid });
          }
        }
      }
      if (!best || comp.length > best.count) best = { points: comp, count: comp.length, thresh: t };
    }
    return best;
  };

  for (const t of [40, 42, 45, 48, 50, 55, 60, 65, 70, 75, 80]) {
    const m = largestComponent(t);
    if (m && m.count >= 350 && m.count <= 12000) {
      let cx = 0;
      let cy = 0;
      for (const p of m.points) {
        cx += p.x;
        cy += p.y;
      }
      const n = m.count || 1;
      return { points: m.points, count: m.count, thresh: t, centroid: { x: cx / n, y: cy / n } };
    }
  }
  return null;
}

function sampleVideoAt(video, plate, x, y) {
  const u = (x - plate.left) / Math.max(1, plate.width);
  const v = (y - plate.top) / Math.max(1, plate.height);
  const tu = Math.min(1, Math.max(0, u - NUDGE.x / PLATE_REF.w));
  const tv = Math.min(1, Math.max(0, v - NUDGE.y / PLATE_REF.h));
  const px = Math.min(video.w - 1, Math.max(0, Math.floor(tu * video.w)));
  const py = Math.min(video.h - 1, Math.max(0, Math.floor((1 - tv) * video.h)));
  return lumaAt(video.data, video.w, px, py);
}

function layerMeans(still, layer, videoA, plate, mask) {
  let stillSum = 0;
  let layerSum = 0;
  let aSum = 0;
  let madSL = 0;
  let madSA = 0;
  let madLA = 0;
  for (const p of mask.points) {
    const ls = lumaAt(still.data, still.w, p.x, p.y);
    const ll = lumaAt(layer.data, layer.w, p.x, p.y);
    const la = sampleVideoAt(videoA, plate, p.x, p.y);
    stillSum += ls;
    layerSum += ll;
    aSum += la;
    madSL += Math.abs(ls - ll);
    madSA += Math.abs(ls - la);
    madLA += Math.abs(ll - la);
  }
  const n = mask.count || 1;
  return {
    stillMean: stillSum / n,
    layerMean: layerSum / n,
    A_mean: aSum / n,
    madVsStill: madSL / n,
    madStillVsA: madSA / n,
    madLayerVsA: madLA / n,
  };
}

function corr(still, layer, mask) {
  const a = [];
  const b = [];
  for (const p of mask.points) {
    a.push(lumaAt(still.data, still.w, p.x, p.y));
    b.push(lumaAt(layer.data, layer.w, p.x, p.y));
  }
  const n = a.length || 1;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let va = 0;
  let vb = 0;
  let cov = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    va += da * da;
    vb += db * db;
    cov += da * db;
  }
  return va && vb ? cov / Math.sqrt(va * vb) : null;
}

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});

async function settle(page) {
  await page.waitForFunction(
    () => {
      const s = window.__tysQa.state();
      return s.seek == null && Math.abs(s.t) < 0.012;
    },
    { timeout: 45_000 },
  );
  await page.waitForTimeout(500);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function captureViewport(label, viewport) {
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

  await page.evaluate(() => window.__tysQa.dwellRamStill());
  await settle(page);
  const stillPath = join(outDir, `aries-ram-still-${label}.png`);
  await page.screenshot({ path: stillPath, type: "png" });
  const still = await loadRgba(stillPath);
  const plateBBox = detectPlateBBox(still);
  const mask = plateBBox ? ramMask(still, plateBBox) : null;

  const aEval = await page.evaluate(async () => window.__tysQa.dwellRamSplitA());
  const aPath = join(outDir, `aries-ram-A-${label}.png`);
  const aBuf = Buffer.from(aEval.dataUrl.split(",")[1], "base64");
  await writeFile(aPath, aBuf);
  const videoA = await loadRgba(aPath);

  const bMeta = await page.evaluate(async () => window.__tysQa.dwellRamSplitB());
  await settle(page);
  const bPath = join(outDir, `aries-ram-B-${label}.png`);
  await page.screenshot({ path: bPath, type: "png" });
  const b = await loadRgba(bPath);

  const cEval = await page.evaluate(async () => window.__tysQa.dwellRamSplitC());
  const pick = cEval.shots?.find((s) => s.videoTime < 0.02) ?? null;
  const cPath = join(outDir, `aries-ram-C-${label}.png`);
  let c = null;
  if (pick?.dataUrl) {
    const cBuf = Buffer.from(pick.dataUrl.split(",")[1], "base64");
    await writeFile(cPath, cBuf);
    c = await loadRgba(cPath);
  }

  await page.evaluate(() => window.__tysQa.clearDwellRamSplit());
  await page.close();

  const valid =
    plateBBox &&
    mask &&
    mask.count >= 350 &&
    mask.count <= 12000 &&
    plateBBox.areaFrac <= 0.38 &&
    plateBBox.width < still.w * 0.98 &&
    (bMeta.currentTime ?? 1) < 0.02 &&
    pick &&
    pick.videoTime < 0.02;

  const bStats = valid ? layerMeans(still, b, videoA, plateBBox, mask) : null;
  const cStats = valid && c ? layerMeans(still, c, videoA, plateBBox, mask) : null;

  return {
    label,
    viewport,
    valid,
    plateBBox,
    mask: mask
      ? { count: mask.count, centroid: mask.centroid, thresh: mask.thresh }
      : null,
    B_video: {
      currentTime: bMeta.currentTime,
      paused: bMeta.paused,
    },
    C_video: {
      sampleMs: pick?.ms ?? null,
      videoTime: pick?.videoTime ?? null,
      paused: pick?.paused ?? null,
      poseOk: pick ? pick.videoTime < 0.02 : false,
    },
    stillMean: valid ? bStats.stillMean : null,
    A_mean: valid ? bStats.A_mean : null,
    B_mean: valid ? bStats.layerMean : null,
    C_mean: valid ? cStats.layerMean : null,
    mad_still_B: valid ? bStats.madVsStill : null,
    mad_still_C: valid ? cStats.madVsStill : null,
    mad_still_A: valid ? bStats.madStillVsA : null,
    mad_B_A: valid ? bStats.madLayerVsA : null,
    mad_C_A: valid ? cStats.madLayerVsA : null,
    corr_still_B: valid ? corr(still, b, mask) : null,
    corr_still_C: valid ? corr(still, c, mask) : null,
  };
}

const phone = await captureViewport("phone", { width: 390, height: 844 });
const desktop = await captureViewport("desktop", { width: 1280, height: 800 });

await mkdir(outDir, { recursive: true });

const report = {
  method:
    "Plate bbox = centered ~16:9 art window (area<=38% viewport). Ram mask = largest 8-connected luma blob in figure band. A_mean = video drawImage@0 via plate UV+nudge. B = dwellBlend 1 paused @0. C = playing, earliest sample with videoTime<0.02.",
  phone,
  desktop,
};

if (phone.valid && desktop.valid && phone.C_video.poseOk && desktop.C_video.poseOk) {
  await writeFile(join(outDir, "aries-ram-split.json"), JSON.stringify(report, null, 2));
} else {
  console.error("Measurement invalid — aries-ram-split.json NOT overwritten", {
    phoneValid: phone.valid,
    desktopValid: desktop.valid,
    phonePose: phone.C_video.poseOk,
    desktopPose: desktop.C_video.poseOk,
    phoneMask: phone.mask?.count,
    desktopMask: desktop.mask?.count,
    phonePlate: phone.plateBBox,
    desktopPlate: desktop.plateBBox,
  });
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
