/**
 * Living halo stars — WebGL captures + phone FPS (parked + moving).
 *
 *   node scripts/qa/living-stars-capture.mjs <outDir>
 *
 * Dev server on 8080. Writes mp4/png under outDir.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";
const outDir = process.argv[2] ?? "screenshots/living-stars";
const CHROME = process.env.QA_CHROME ?? "/usr/local/bin/google-chrome";
const SIGN_INDEX = { aries: 0, gemini: 2, pisces: 11 };
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required",
    "--ignore-gpu-blocklist",
  ],
});

const report = { base: BASE, captures: {}, fps: {} };

async function dismissOk(page) {
  await page.locator("button", { hasText: /^OK$/ }).first().click({ timeout: 3000 }).catch(() => {});
}

async function ready(page, preload = ["aries", "gemini", "pisces"]) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 60_000 });
  await page.evaluate((ids) => {
    window.__tysQa.ready();
    for (const id of ids) window.__tysQa.preload(id);
  }, preload);
  await page.waitForTimeout(9000);
  await dismissOk(page);
}

const SIGN_IDS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

async function parkAt(page, index) {
  const id = SIGN_IDS[index];
  const label = id.charAt(0).toUpperCase() + id.slice(1);
  await page.locator(`button[aria-label^='${label}']`).first().click({ timeout: 8000 });
  await page
    .waitForFunction(
      (i) => {
        const s = window.__tysQa.state();
        const target = window.__tysQa.signIndex(
          ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"][i],
        );
        const t = (target + 0.5) / 12;
        return s.seek == null && Math.abs(s.t - t) < 0.012;
      },
      index,
      { timeout: 15_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(2800);
}

async function startFps(page) {
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (now) => {
      window.__frames.push({ at: now, dt: now - last });
      last = now;
      window.__fpsRaf = requestAnimationFrame(tick);
    };
    window.__fpsRaf = requestAnimationFrame(tick);
  });
}

async function readFps(page, ms = 4000) {
  await page.waitForTimeout(ms);
  return page.evaluate(() => {
    cancelAnimationFrame(window.__fpsRaf);
    const d = window.__frames.map((f) => f.dt).sort((a, b) => a - b);
    const pick = (q) => d[Math.min(d.length - 1, Math.floor(q * d.length))] ?? 0;
    const secs = (window.__frames.at(-1)?.at ?? 0) - (window.__frames[0]?.at ?? 0);
    return {
      frames: d.length,
      fps: secs > 0 ? +((d.length / secs) * 1000).toFixed(1) : 0,
      medianMs: +pick(0.5).toFixed(1),
      p95Ms: +pick(0.95).toFixed(1),
    };
  });
}

async function wheelSeries(page, events) {
  const total = await page.evaluate((list) => {
    const canvas = document.querySelector("canvas");
    const x = innerWidth / 2;
    const y = innerHeight / 2;
    let at = 0;
    for (const [gap, dy] of list) {
      at += gap;
      setTimeout(() => {
        canvas.dispatchEvent(
          new WheelEvent("wheel", { deltaY: dy, clientX: x, clientY: y, bubbles: true, cancelable: true }),
        );
      }, at);
    }
    return at;
  }, events);
  await page.waitForTimeout(total + 80);
}

async function recordVideo(page, context, name, durationMs, setup) {
  const rawDir = join(outDir, `${name}-raw`);
  await rm(rawDir, { recursive: true, force: true });
  await mkdir(rawDir, { recursive: true });
  const vidPage = await context.newPage();
  await vidPage.goto(page.url(), { waitUntil: "domcontentloaded" }).catch(() => {});
  await vidPage.close().catch(() => {});
  const recCtx = await browser.newContext({
    viewport: page.viewportSize() ?? { width: 1280, height: 720 },
    recordVideo: { dir: rawDir, size: page.viewportSize() ?? { width: 1280, height: 720 } },
  });
  const rec = await recCtx.newPage();
  await rec.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await ready(rec, ["aries", "gemini", "pisces"]);
  if (setup) await setup(rec);
  await rec.waitForTimeout(durationMs);
  await recCtx.close();
  const [webm] = (await readdir(rawDir)).filter((f) => f.endsWith(".webm"));
  const mp4 = join(outDir, `${name}.mp4`);
  if (webm) {
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      join(rawDir, webm),
      "-t",
      String(durationMs / 1000),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "20",
      "-movflags",
      "+faststart",
      mp4,
    ]);
  }
  await rm(rawDir, { recursive: true, force: true });
  const bytes = webm ? (await stat(mp4)).size : 0;
  return { path: mp4, bytes };
}

async function desktopSignVideo(signId) {
  const rawDir = join(outDir, `${signId}-after-raw`);
  await rm(rawDir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: rawDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await ready(page, [signId, "aries", "pisces"]);
  await parkAt(page, SIGN_INDEX[signId]);
  await page.waitForTimeout(8000);
  await page.screenshot({ path: join(outDir, `${signId}-after-still.png`), animations: "allow" });
  await context.close();
  const [webm] = (await readdir(rawDir)).filter((f) => f.endsWith(".webm"));
  const mp4 = join(outDir, `${signId}-after.mp4`);
  if (webm) {
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      join(rawDir, webm),
      "-t",
      "8",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      "-movflags",
      "+faststart",
      mp4,
    ]);
  }
  await rm(rawDir, { recursive: true, force: true });
  const mp4Size = (await stat(mp4)).size;
  if (mp4Size < 200_000) {
    throw new Error(`${signId}-after.mp4 too small (${mp4Size} bytes) — likely blank capture`);
  }
  return { mp4: mp4Size, still: (await stat(join(outDir, `${signId}-after-still.png`))).size };
}

async function phoneFps() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await ready(page);
  await parkAt(page, SIGN_INDEX.pisces);
  await startFps(page);
  report.fps.phoneParked = await readFps(page, 4500);
  await wheelSeries(page, [[0, 80], [16, 80], [16, 80], [16, 80], [16, 80], [16, 80], [16, 80], [16, 80]]);
  await startFps(page);
  report.fps.phoneMoving = await readFps(page, 3500);
  const png = join(outDir, "phone-pisces-after.png");
  await page.screenshot({ path: png, animations: "allow" });
  report.captures.phonePisces = { path: png, bytes: (await stat(png)).size };
  await context.close();
}

async function travelVideo() {
  const rawDir = join(outDir, "travel-after-raw");
  await rm(rawDir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: rawDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await ready(page, ["aries", "taurus", "gemini"]);
  await parkAt(page, SIGN_INDEX.aries);
  await page.evaluate(() => {
    window.__trace = [];
    const tick = () => {
      const s = window.__tysQa.state();
      window.__trace.push({
        plates: s.plates.map((w) => +w.toFixed(3)),
        vel: s.vel,
        seek: s.seek,
      });
      window.__traceRaf = requestAnimationFrame(tick);
    };
    window.__traceRaf = requestAnimationFrame(tick);
  });
  const ev = [];
  for (let i = 0; i < 28; i += 1) ev.push([20, 55]);
  await wheelSeries(page, ev);
  await page.waitForTimeout(3500);
  const trace = await page.evaluate(() => {
    cancelAnimationFrame(window.__traceRaf);
    return window.__trace;
  });
  let maxLive = 0;
  let stack = 0;
  for (const r of trace) {
    const live = r.plates.filter((w) => w > 0.02).length;
    maxLive = Math.max(maxLive, live);
    const s = [...r.plates].sort((a, b) => b - a);
    if ((s[1] ?? 0) > 0.35) stack += 1;
  }
  report.travel = { maxLivePlates: maxLive, stackFrames: stack, frames: trace.length };
  await page.waitForTimeout(500);
  await context.close();
  const [webm] = (await readdir(rawDir)).filter((f) => f.endsWith(".webm"));
  const mp4 = join(outDir, "travel-after.mp4");
  if (webm) {
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      join(rawDir, webm),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "20",
      "-movflags",
      "+faststart",
      mp4,
    ]);
  }
  await rm(rawDir, { recursive: true, force: true });
  report.captures.travelAfter = { path: mp4, bytes: (await stat(mp4)).size };
}

async function piscesRefresh() {
  const rawDir = join(outDir, "pisces-after-raw");
  await rm(rawDir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: rawDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await ready(page, ["pisces"]);
  await parkAt(page, SIGN_INDEX.pisces);
  await page.waitForTimeout(8000);
  await page.screenshot({ path: join(outDir, "pisces-after-still.png"), animations: "allow" });
  await context.close();
  const [webm] = (await readdir(rawDir)).filter((f) => f.endsWith(".webm"));
  const mp4 = join(outDir, "pisces-after.mp4");
  if (webm) {
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      join(rawDir, webm),
      "-t",
      "8",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "20",
      "-movflags",
      "+faststart",
      mp4,
    ]);
  }
  await rm(rawDir, { recursive: true, force: true });
  report.captures.piscesAfter = {
    mp4: (await stat(mp4)).size,
    still: (await stat(join(outDir, "pisces-after-still.png"))).size,
  };
}

const mode = process.argv[3] ?? "all";
if (mode === "signs" || mode === "all") {
  report.captures.aries = await desktopSignVideo("aries");
  report.captures.gemini = await desktopSignVideo("gemini");
}
if (mode === "all") {
  await piscesRefresh();
  await travelVideo();
  await phoneFps();
}

await browser.close();
await writeFile(join(outDir, "living-stars-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
