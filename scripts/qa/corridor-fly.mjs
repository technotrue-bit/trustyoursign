/**
 * Corridor fly QA: drive the home sky with a wheel notch, a trackpad dribble,
 * a flick, and a phone swipe; trace every frame (t, speed, plate weights, clip)
 * and capture real WebGL frames.
 *
 *   node scripts/qa/corridor-fly.mjs <outDir> [probe|desktop|phone|video|clip|all]
 *
 * Dev server only (reads the dev QA hooks).
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:8080";
const outDir = process.argv[2] ?? "screenshots/corridor-fly";
const mode = process.argv[3] ?? "all";
const CHROME = process.env.QA_CHROME ?? "/usr/local/bin/google-chrome";
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

const report = {};

async function boot(page, at = 0) {
  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`[error] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message.slice(0, 240)}`));
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 60_000 });
  await page.evaluate(() => {
    window.__tysQa.ready();
    for (const id of ["aries", "taurus", "gemini", "cancer", "leo"]) window.__tysQa.preload(id);
  });
  if (at > 0) {
    await page.evaluate((i) => window.__tysQa.parkAt(i), at);
  }
  // Plates hydrate on a staggered timer; give the software GPU time to upload them.
  await page.waitForTimeout(9000);
  // The one-cookie notice sits over the plate; a visitor dismisses it once.
  await page
    .locator("button", { hasText: /^OK$/ })
    .first()
    .click({ timeout: 3000 })
    .catch(() => {});
  await startTrace(page);
  return problems;
}

/** Record one row per rendered frame, in the page, so nothing is missed between polls. */
async function startTrace(page) {
  await page.evaluate(() => {
    window.__trace = [];
    const t0 = performance.now();
    const tick = () => {
      const s = window.__tysQa.state();
      const v = document.querySelector("video[data-dwell-clip]");
      window.__trace.push({
        ms: Math.round(performance.now() - t0),
        t: s.t,
        vel: s.vel,
        seek: s.seek,
        kind: s.seekKind,
        clip: s.dwellClipIndex,
        video: v ? { paused: v.paused, time: +v.currentTime.toFixed(2) } : null,
        plates: s.plates.map((w) => +w.toFixed(3)),
      });
      window.__traceRaf = requestAnimationFrame(tick);
    };
    window.__traceRaf = requestAnimationFrame(tick);
  });
}

async function readTrace(page, name) {
  const trace = await page.evaluate(() => {
    cancelAnimationFrame(window.__traceRaf);
    return window.__trace;
  });
  if (name) await writeFile(join(outDir, `${name}-trace.json`), JSON.stringify(trace));
  return trace;
}

/** What the trace says about the feel. */
function summarize(trace) {
  const S = 11;
  let maxLive = 0;
  let stackFrames = 0;
  let peakVel = 0;
  let peakAccel = 0;
  for (let i = 0; i < trace.length; i += 1) {
    const row = trace[i];
    const live = row.plates.filter((w) => w > 0.02).length;
    maxLive = Math.max(maxLive, live);
    const sorted = [...row.plates].sort((a, b) => b - a);
    // Two plates both above 0.35 is a stack; the midpoint dissolve crosses at 0.5 only briefly.
    if ((sorted[1] ?? 0) > 0.35) stackFrames += 1;
    peakVel = Math.max(peakVel, Math.abs(row.vel));
    // Speed change over ~a quarter second, so one uneven software frame is not "jerk".
    const back = trace[Math.max(0, i - 5)];
    if (back && row.ms - back.ms > 150) {
      peakAccel = Math.max(peakAccel, Math.abs(row.vel - back.vel) / ((row.ms - back.ms) / 1000));
    }
  }
  const end = trace.at(-1);
  const frames = trace.length;
  const secs = end ? end.ms / 1000 : 0;
  return {
    frames,
    fps: secs > 0 ? +(frames / secs).toFixed(1) : 0,
    maxLivePlates: maxLive,
    stackFrames,
    peakSignsPerSec: +(peakVel * S).toFixed(2),
    peakAccelSignsPerSec2: +(peakAccel * S).toFixed(2),
    endSign: end ? +(end.t * S).toFixed(3) : null,
  };
}

async function center(page) {
  const vp = page.viewportSize();
  await page.mouse.move(vp.width / 2, vp.height / 2);
}

/**
 * Fire wheel events on the canvas at real input timings, scheduled in the page.
 * (page.mouse.wheel waits on the software renderer per call, which stretches a
 * 0.2 s flick into seconds of scrolling.)
 */
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
  await page.waitForTimeout(total + 50);
}

/** One mouse-wheel notch. */
async function notch(page, dy = 100) {
  await wheelSeries(page, [[0, dy]]);
}

/** Trackpad two-finger scroll: many small deltas, ~0.5 s. */
async function trackpad(page, total = 180, step = 6) {
  const ev = [];
  for (let sent = 0; sent < total; sent += step) ev.push([16, step]);
  await wheelSeries(page, ev);
}

/** A hard flick: 0.16 s of big deltas, then the trackpad's momentum tail. */
async function flick(page) {
  const ev = [];
  for (let i = 0; i < 20; i += 1) ev.push([8, 60]);
  for (let dy = 40; dy > 1; dy *= 0.9) ev.push([16, +dy.toFixed(1)]);
  await wheelSeries(page, ev);
}

/**
 * Poll until the camera is still gliding (> 0.3 signs/s) and the arriving plate
 * owns the frame — the moment a pile-up used to happen.
 */
async function waitMidTravel(page, from, timeoutMs = 5000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const s = await page.evaluate(() => window.__tysQa.state());
    const live = s.plates.map((w, i) => [i, w]).filter(([, w]) => w > 0.02);
    const moving = s.seek != null && Math.abs(s.vel) * 11 > 0.25;
    if (moving && live.length === 1 && live[0][0] !== from && live[0][1] > 0.95) return s;
    await page.waitForTimeout(10);
  }
  return null;
}

async function shotSize(path) {
  return (await stat(path)).size;
}

async function desktop() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // Start on Taurus: the parked selection hold keeps the hands-off walk out of the trace.
  const problems = await boot(page, 1);
  await center(page);
  await notch(page);
  const mid = await waitMidTravel(page, 1);
  const path = join(outDir, "desktop-mid-travel.png");
  await page.screenshot({ path, animations: "allow" });
  await page.waitForTimeout(2600);
  await trackpad(page);
  await page.waitForTimeout(2600);
  await flick(page);
  await page.waitForTimeout(4200);
  const trace = await readTrace(page, "desktop");
  report.desktop = { summary: summarize(trace), mid, shotBytes: await shotSize(path), problems };
  await page.close();
}

async function phone() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const problems = await boot(page, 1);
  // A finger slides right-to-left (forward) across ~40% of the screen in 0.2 s,
  // dispatched in the page at real timings (touch pointer events, as a phone sends).
  const swipeMs = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const y = 420;
    const fire = (type, x) =>
      canvas.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 7,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        }),
      );
    let x = 300;
    fire("pointerdown", x);
    let at = 0;
    for (let i = 0; i < 12; i += 1) {
      at += 16;
      const nx = (x -= 12);
      setTimeout(() => fire("pointermove", nx), at);
    }
    setTimeout(() => fire("pointerup", x), at + 16);
    return at + 16;
  });
  await page.waitForTimeout(swipeMs);
  const mid = await waitMidTravel(page, 1);
  const path = join(outDir, "phone-mid-travel.png");
  await page.screenshot({ path, animations: "allow" });
  await page.waitForTimeout(3500);
  const trace = await readTrace(page, "phone");
  report.phone = { summary: summarize(trace), mid, shotBytes: await shotSize(path), problems };
  await context.close();
}

async function video() {
  const dir = join(outDir, "video-raw");
  await rm(dir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const problems = await boot(page, 1);
  await center(page);
  // One notch, a pause on the sign, a trackpad dribble, then a flick.
  await notch(page);
  await page.waitForTimeout(3000);
  await trackpad(page);
  await page.waitForTimeout(3000);
  await flick(page);
  await page.waitForTimeout(5000);
  const trace = await readTrace(page, "video");
  await context.close();
  const [webm] = (await readdir(dir)).filter((f) => f.endsWith(".webm"));
  const mp4 = join(outDir, "desktop-wheel.mp4");
  // Trim the 9 s boot so the clip opens on the parked sky.
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    "9.5",
    "-i",
    join(dir, webm),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-movflags",
    "+faststart",
    mp4,
  ]);
  await rename(join(dir, webm), join(outDir, "desktop-wheel-raw.webm")).catch(() => {});
  report.video = { summary: summarize(trace), bytes: await shotSize(mp4), problems };
}

async function clip() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // Park on Taurus, then one notch back to Aries: the dwell is timed from a real arrival.
  const problems = await boot(page, 1);
  await center(page);
  await notch(page, -100);
  const landed = await page.waitForFunction(
    () => {
      const s = window.__tysQa.state();
      return s.seek == null && Math.abs(s.t) < 1e-6 && Math.abs(s.vel) < 0.002 ? performance.now() : 0;
    },
    null,
    { timeout: 8000, polling: 16 },
  );
  const landedAt = await landed.jsonValue();
  // Parked on Aries: the clip may arm only after the still dwell.
  const started = await page.waitForFunction(
    () => {
      const v = document.querySelector("video[data-dwell-clip]");
      return v && !v.paused && v.currentTime > 0 ? performance.now() : 0;
    },
    null,
    { timeout: 12_000, polling: 16 },
  ).catch(() => null);
  const startedAt = started ? await started.jsonValue() : null;
  await page.waitForTimeout(900);
  const rolling = join(outDir, "desktop-aries-clip.png");
  if (startedAt) await page.screenshot({ path: rolling, animations: "allow" });
  // Mid-roar swipe: one wheel notch. The clip must die inside the same input task.
  const killed = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: 100,
        clientX: innerWidth / 2,
        clientY: innerHeight / 2,
        bubbles: true,
        cancelable: true,
      }),
    );
    return {
      clip: window.__tysQa.state().dwellClipIndex,
      videoLeft: Boolean(document.querySelector("video[data-dwell-clip]")),
    };
  });
  await page.waitForTimeout(300);
  const moving = join(outDir, "desktop-clip-killed.png");
  await page.screenshot({ path: moving, animations: "allow" });
  await page.waitForTimeout(2500);
  const trace = await readTrace(page, "clip");
  const playedWhileMoving = trace.filter(
    (r) => r.video && !r.video.paused && (r.seek != null || Math.abs(r.vel) > 0.002),
  ).length;
  report.clip = {
    settledToPlaySec: startedAt && landedAt ? +((startedAt - landedAt) / 1000).toFixed(2) : null,
    killed,
    playedWhileMovingFrames: playedWhileMoving,
    summary: summarize(trace),
    problems,
  };
  await page.close();
}

/** Pause mid-glide freezes the sky; resume lands it. Enter dives; Skip lands on the hub. */
async function controls() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const problems = await boot(page, 1);
  await center(page);
  await notch(page);
  await page.waitForTimeout(700);
  const pauseBtn = page.getByRole("button", { name: /pause/i }).first();
  await pauseBtn.click();
  const a = await page.evaluate(() => window.__tysQa.state().t);
  await page.waitForTimeout(1200);
  const b = await page.evaluate(() => window.__tysQa.state().t);
  await page.getByRole("button", { name: /resume|play/i }).first().click().catch(() => pauseBtn.click());
  await page.waitForTimeout(3500);
  const landed = await page.evaluate(() => window.__tysQa.state());
  const entered = await page.evaluate(() => window.__tysQa.enter(Math.round(window.__tysQa.state().t * 11)));
  await page.waitForTimeout(600);
  const diving = await page.evaluate(() => window.__tysQa.state().phase);
  await page.evaluate(() => window.__tysQa.skip());
  await page.waitForTimeout(1800);
  const inside = await page.evaluate(() => window.__tysQa.state().phase);
  const path = join(outDir, "desktop-after-skip.png");
  await page.screenshot({ path, animations: "allow" });
  await readTrace(page, "controls");
  report.controls = {
    pausedFrozen: Math.abs(b - a) < 1e-4,
    pausedDriftSigns: +((b - a) * 11).toFixed(4),
    landedSign: +(landed.t * 11).toFixed(4),
    enterStarted: entered,
    phaseAfterEnter: diving,
    phaseAfterSkip: inside,
    shotBytes: await shotSize(path),
    problems,
  };
  await page.close();
}

/** Reduced motion gets the 2D sky: one notch cuts one sign, no travel, no clip. */
async function reduced() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const problems = await boot(page);
  const before = await page.evaluate(() => window.__tysQa.state().t);
  await notch(page);
  // Sample every frame for a second: a cut has no in-between values.
  const samples = await page.evaluate(
    () =>
      new Promise((done) => {
        const out = [];
        const t0 = performance.now();
        const tick = () => {
          out.push(window.__tysQa.state().t);
          if (performance.now() - t0 < 1000) requestAnimationFrame(tick);
          else done(out);
        };
        requestAnimationFrame(tick);
      }),
  );
  const between = samples.filter((t) => {
    const u = t * 11;
    return Math.abs(u - Math.round(u)) > 0.01;
  }).length;
  await page.waitForTimeout(3500);
  const hasVideo = await page.evaluate(() => Boolean(document.querySelector("video[data-dwell-clip]")));
  const webgl = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    return Boolean(c && (c.getContext("webgl2") || c.getContext("webgl")));
  });
  const path = join(outDir, "phone-reduced-motion.png");
  await page.screenshot({ path, animations: "allow" }).catch(() => {});
  await readTrace(page, "reduced");
  report.reduced = {
    fromSign: +(before * 11).toFixed(3),
    toSign: +(samples.at(-1) * 11).toFixed(3),
    inBetweenFrames: between,
    clipElement: hasVideo,
    canvasIsWebGL: webgl,
    problems,
  };
  await context.close();
}

async function probe() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const problems = await boot(page);
  await page.waitForTimeout(1500);
  const path = join(outDir, "probe.png");
  await page.screenshot({ path, animations: "allow" });
  const trace = await readTrace(page, "probe");
  report.probe = { summary: summarize(trace), shotBytes: await shotSize(path), problems };
  await page.close();
}

const plan = mode === "all" ? ["desktop", "phone", "clip", "video"] : [mode];
for (const step of plan) {
  if (step === "probe") await probe();
  if (step === "desktop") await desktop();
  if (step === "phone") await phone();
  if (step === "clip") await clip();
  if (step === "video") await video();
  if (step === "controls") await controls();
  if (step === "reduced") await reduced();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
