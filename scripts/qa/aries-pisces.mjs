/**
 * Aries → Pisces from the sign strip: the calendar neighbour that sits at the far
 * end of the tropical corridor. Records frame intervals, long tasks, and (on the
 * dev server) the travel trace, plus a video.
 *
 *   node scripts/qa/aries-pisces.mjs <base-url> <outDir> [label]
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:8080";
const outDir = process.argv[3] ?? "screenshots/aries-pisces";
const label = process.argv[4] ?? "run";
/** "returning": the intro is already seen, so the jump is measured on its own. */
const visitor = process.argv[5] ?? "first";
const CHROME = process.env.QA_CHROME ?? "/usr/local/bin/google-chrome";
const VIEW = { width: 1280, height: 720 };
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
const rawDir = join(outDir, `${label}-raw`);
await rm(rawDir, { recursive: true, force: true });
const context = await browser.newContext({ viewport: VIEW, recordVideo: { dir: rawDir, size: VIEW } });
if (visitor === "returning") {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("templeIntroSeen", "1");
    } catch {
      /* private mode */
    }
  });
}
const page = await context.newPage();
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`[error] ${m.text().slice(0, 200)}`);
});
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message.slice(0, 200)}`));

const bootAt = Date.now();
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 60_000 });
// Skip the opening the way a visitor can (Escape), until the strip is live.
for (let i = 0; i < 40; i += 1) {
  await page.keyboard.press("Escape").catch(() => {});
  const ready = await page
    .locator("button[aria-label^='Pisces']")
    .first()
    .isVisible()
    .catch(() => false);
  if (ready) break;
  await page.waitForTimeout(500);
}
await page.locator("button", { hasText: /^OK$/ }).first().click({ timeout: 3000 }).catch(() => {});
// Park on Aries (the home sky opens there) and let plates hydrate.
await page.locator("button[aria-label^='Aries']").first().click();
await page.waitForTimeout(7000);

await page.evaluate(() => {
  const w = window;
  w.__frames = [];
  w.__long = [];
  w.__trace = [];
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__long.push({ at: e.startTime, ms: e.duration });
    });
    po.observe({ type: "longtask", buffered: false });
    w.__po = po;
  } catch {
    /* longtask unsupported */
  }
  let last = performance.now();
  const tick = (now) => {
    w.__frames.push({ at: now, dt: now - last });
    last = now;
    const qa = w.__tysQa;
    if (qa) {
      const s = qa.state();
      w.__trace.push({
        at: now,
        t: s.t,
        vel: s.vel,
        seek: s.seek,
        kind: s.seekKind,
        plates: s.plates.map((x) => +x.toFixed(3)),
        cam: s.probe,
        portal: s.portalPhase, psigns: s.portalSigns, pcam: s.portalCamV, intro: s.introPlaying, asking: s.introAsking,
      });
    }
    w.__raf = requestAnimationFrame(tick);
  };
  w.__raf = requestAnimationFrame(tick);
});
await page.waitForTimeout(1500);
const clickAt = await page.evaluate(() => performance.now());
await page.locator("button[aria-label^='Pisces']").first().click();
await page.waitForTimeout(5000);
const shot = join(outDir, `${label}-landed.png`);
await page.screenshot({ path: shot, animations: "allow" });
const data = await page.evaluate(() => {
  cancelAnimationFrame(window.__raf);
  window.__po?.disconnect();
  return { frames: window.__frames, long: window.__long, trace: window.__trace };
});
const videoStartOffset = (Date.now() - bootAt) / 1000;
await context.close();
await browser.close();

const T0 = clickAt;
const before = data.frames.filter((f) => f.at < T0);
const during = data.frames.filter((f) => f.at >= T0 && f.at < T0 + 3500);
const stats = (fs) => {
  const d = fs.map((f) => f.dt).sort((a, b) => a - b);
  const pick = (q) => d[Math.min(d.length - 1, Math.floor(q * d.length))] ?? 0;
  return {
    frames: d.length,
    medianMs: +pick(0.5).toFixed(1),
    p95Ms: +pick(0.95).toFixed(1),
    maxMs: +(d.at(-1) ?? 0).toFixed(1),
    over100ms: d.filter((x) => x > 100).length,
  };
};
const longDuring = data.long.filter((l) => l.at >= T0 && l.at < T0 + 3500);
const report = {
  base: BASE,
  label,
  visitor,
  parked: stats(before),
  transition: stats(during),
  longTasks: { count: longDuring.length, totalMs: Math.round(longDuring.reduce((a, l) => a + l.ms, 0)), worstMs: Math.round(Math.max(0, ...longDuring.map((l) => l.ms))) },
  problems,
};
if (data.trace.length) {
  const tr = data.trace.filter((r) => r.at >= T0 - 100);
  let maxLive = 0;
  let stack = 0;
  let peakVel = 0;
  for (const r of tr) {
    const live = r.plates.filter((w) => w > 0.02);
    maxLive = Math.max(maxLive, live.length);
    const s = [...r.plates].sort((a, b) => b - a);
    if ((s[1] ?? 0) > 0.35) stack += 1;
    peakVel = Math.max(peakVel, Math.abs(r.vel));
  }
  const settled = tr.find((r, i) => i > 3 && r.seek == null && Math.abs(r.t - 1) < 1e-6);
  report.travel = {
    peakSignsPerSec: +(peakVel * 11).toFixed(2),
    maxLivePlates: maxLive,
    stackFrames: stack,
    tSettledSec: settled ? +((settled.at - T0) / 1000).toFixed(2) : null,
  };
  await writeFile(join(outDir, `${label}-trace.json`), JSON.stringify({ T0, trace: tr, frames: during, long: longDuring }));
}
const [webm] = (await readdir(rawDir)).filter((f) => f.endsWith(".webm"));
if (webm) {
  const clickSec = videoStartOffset - (5000 + 0) / 1000 - 0.3;
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-ss", String(Math.max(0, clickSec - 1.5)),
    "-i", join(rawDir, webm),
    "-t", "6.5",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart",
    join(outDir, `${label}.mp4`),
  ]);
  await rename(join(rawDir, webm), join(outDir, `${label}-raw.webm`)).catch(() => {});
}
await rm(rawDir, { recursive: true, force: true });
console.log(JSON.stringify(report, null, 2));
