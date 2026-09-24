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

async function loadGrayCrop(path, cropFrac = 0.42) {
  const meta = await sharp(path).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const cw = Math.round(w * cropFrac);
  const ch = Math.round(h * cropFrac);
  const left = Math.round((w - cw) / 2);
  const top = Math.round((h - ch) / 2);
  const { data, info } = await sharp(path)
    .extract({ left, top, width: cw, height: ch })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, crop: { left, top, width: cw, height: ch } };
}

function normalizeGray(data) {
  let mean = 0;
  for (let i = 0; i < data.length; i++) mean += data[i];
  mean /= data.length || 1;
  let variance = 0;
  for (let i = 0; i < data.length; i++) {
    const d = data[i] - mean;
    variance += d * d;
  }
  const std = Math.sqrt(variance / (data.length || 1)) || 1;
  const out = new Float64Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = (data[i] - mean) / std;
  return out;
}

function corrShift(a, aw, ah, b, bw, bh, dx, dy) {
  let sum = 0;
  let n = 0;
  let abs = 0;
  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      const bx = x + dx;
      const by = y + dy;
      if (bx < 0 || by < 0 || bx >= bw || by >= bh) continue;
      const av = a[y * aw + x];
      const bv = b[by * bw + bx];
      sum += av * bv;
      abs += Math.abs(av - bv);
      n++;
    }
  }
  if (!n) return { correlation: 0, meanAbs: 0, overlap: 0 };
  return { correlation: sum / n, meanAbs: abs / n, overlap: n };
}

function bestCorrelation(aPath, bPath, cropFrac = 0.42, search = 24) {
  return loadGrayCrop(aPath, cropFrac).then(async (Araw) => {
    const Braw = await loadGrayCrop(bPath, cropFrac);
    const a = normalizeGray(Araw.data);
    const b = normalizeGray(Braw.data);
    let best = { correlation: -2, shift: { x: 0, y: 0 }, meanAbs: 0 };
    let atZero = { correlation: 0, meanAbs: 0 };
    for (let dy = -search; dy <= search; dy++) {
      for (let dx = -search; dx <= search; dx++) {
        const { correlation, meanAbs } = corrShift(a, Araw.w, Araw.h, b, Braw.w, Braw.h, dx, dy);
        if (dx === 0 && dy === 0) atZero = { correlation, meanAbs };
        if (correlation > best.correlation) best = { correlation, shift: { x: dx, y: dy }, meanAbs };
      }
    }
    return { ...best, atZero, crop: Araw.crop };
  });
}

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
      const video = document.querySelector('video[data-dwell-clip="aries"]');
      if (video && m !== "still") {
        await new Promise((resolve) => {
          if (video.readyState >= 1) resolve();
          else video.addEventListener("loadedmetadata", () => resolve(), { once: true });
        });
        if (m === "life0") video.currentTime = 0;
        else {
          const end =
            Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6.041667;
          video.currentTime = Math.max(0, end - 1 / 30);
        }
        video.pause();
        await new Promise((resolve) => {
          if (video.readyState >= 2) resolve();
          else video.addEventListener("seeked", () => resolve(), { once: true });
        });
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, mode);
    await page.waitForFunction(
      () => {
        const s = window.__tysQa.state();
        return s.seek == null && Math.abs(s.t) < 0.012;
      },
      { timeout: 30_000 },
    );
    await page.waitForTimeout(900);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const meta = await page.evaluate(() => {
      const f = window.__tysQa.dwellClipFrame("aries");
      const v = document.querySelector('video[data-dwell-clip="aries"]');
      return {
        ...f,
        dwellPlateQa: window.__tysQa.state().dwellClipIndex,
        videoWidth: v?.videoWidth ?? null,
        videoHeight: v?.videoHeight ?? null,
      };
    });
    await page.screenshot({ path: join(outDir, file), type: "png" });
    return meta;
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
  const frame0VsLast = await bestCorrelation(
    join(outDir, frame0Path),
    join(outDir, lastPath),
  );
  const stillVsFrame0 = await bestCorrelation(
    join(outDir, stillPath),
    join(outDir, frame0Path),
  );

  return {
    label,
    stillMeta,
    frame0Meta,
    lastMeta,
    frame0VsStill,
    lastVsStill,
    frame0VsLast,
    stillVsFrame0,
  };
}

const phone = await captureViewport("phone", { width: 390, height: 844 });
const desktop = await captureViewport("desktop", { width: 1280, height: 800 });

const report = {
  note:
    "Brightness-normalized correlation on center ram crop (±24px shift search). stillVsFrame0 near 1 at shift (0,0) means stack; frame0VsLast near 1 means clip returns to its own pose.",
  phone,
  desktop,
};

await writeFile(join(outDir, "aries-plate-compare.json"), JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
