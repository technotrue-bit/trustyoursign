/**
 * BAR(1) critic measurement — mid-session frame pacing + long tasks on `/`.
 * Mid-phone viewport 390×844 + CDP CPU throttle (default 4×).
 *
 * Metrics:
 * - rAF deltas (vsync pacing; spikes = dropped frames)
 * - PerformanceObserver longtask (>50ms fails BAR)
 * - Derived FPS from sample wall clock
 *
 * Usage: node scripts/measure-bar1-frames.mjs [url]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";
import { checkedUrl } from "./browser-guard.mjs";

const url = checkedUrl(process.argv[2] || process.env.BAR1_URL || "http://127.0.0.1:8080/");
const cpuThrottle = Math.max(1, Number(process.env.BAR1_CPU_THROTTLE || 4));
const outPath = resolve(
  process.env.BAR1_OUT || resolve("screenshots", "bar1-frame-measure.json"),
);

const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };

function pct(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

function summarize(durations, wallMs) {
  if (!durations.length) return null;
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const fps = wallMs > 0 ? Number(((sorted.length / wallMs) * 1000).toFixed(2)) : null;
  return {
    samples: sorted.length,
    avgMs: Number((sum / sorted.length).toFixed(3)),
    p50Ms: Number(pct(sorted, 50).toFixed(3)),
    p95Ms: Number(pct(sorted, 95).toFixed(3)),
    p99Ms: Number(pct(sorted, 99).toFixed(3)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(3)),
    over16_7: sorted.filter((d) => d > 16.7).length,
    over33_4: sorted.filter((d) => d > 33.4).length,
    over50: sorted.filter((d) => d > 50).length,
    fps,
  };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle"],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  if (cpuThrottle > 1) {
    await client.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
  }

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);

  // Dismiss gloss card if present
  const glossOk = page.getByRole("button", { name: /^OK$/i });
  if (await glossOk.isVisible().catch(() => false)) {
    await glossOk.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Skip intro
  const skip = page.getByRole("button", { name: /^Skip$/i });
  for (let i = 0; i < 20; i++) {
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      break;
    }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200);

  // Sign strip is a <ul aria-label="The twelve signs">
  const strip = page.locator('ul[aria-label="The twelve signs"]');
  await strip.waitFor({ state: "visible", timeout: 45000 });
  const signButtons = strip.locator("button.sign-strip-btn");
  const count = await signButtons.count();
  if (count < 12) {
    throw new Error(`expected 12 sign buttons, got ${count}`);
  }

  await page.evaluate(() => {
    window.__bar1 = {
      frames: [],
      longTasks: [],
      phases: [],
      collecting: false,
    };
    const obs = new PerformanceObserver((list) => {
      if (!window.__bar1.collecting) return;
      for (const e of list.getEntries()) {
        window.__bar1.longTasks.push({
          duration: e.duration,
          startTime: e.startTime,
          name: e.name,
        });
      }
    });
    try {
      obs.observe({ type: "longtask", buffered: false });
    } catch {
      /* unsupported */
    }
    window.__bar1._obs = obs;

    let last = performance.now();
    const tick = (now) => {
      if (window.__bar1.collecting) {
        window.__bar1.frames.push(now - last);
      }
      last = now;
      window.__bar1._raf = requestAnimationFrame(tick);
    };
    window.__bar1._raf = requestAnimationFrame(tick);
  });

  const phases = [];

  async function measurePhase(name, action, holdMs = 0) {
    await page.evaluate((n) => {
      window.__bar1.collecting = true;
      window.__bar1.phases.push({
        name: n,
        start: performance.now(),
        frameStart: window.__bar1.frames.length,
        longStart: window.__bar1.longTasks.length,
      });
    }, name);
    if (action) await action();
    if (holdMs > 0) await page.waitForTimeout(holdMs);
    const meta = await page.evaluate((n) => {
      window.__bar1.collecting = false;
      const phase = window.__bar1.phases.find((p) => p.name === n);
      return {
        name: n,
        elapsedMs: performance.now() - (phase?.start ?? performance.now()),
        frameStart: phase?.frameStart ?? 0,
        frameEnd: window.__bar1.frames.length,
        longStart: phase?.longStart ?? 0,
        longEnd: window.__bar1.longTasks.length,
      };
    }, name);
    phases.push(meta);
  }

  // Mid-session settle after skip
  await measurePhase("mid-session-settle", null, 2500);

  // Fly-through: seek several signs (direct strip jumps)
  const flyTargets = ["Aries", "Leo", "Scorpio", "Aquarius", "Gemini"];
  await measurePhase(
    "fly-sign-travel",
    async () => {
      for (const name of flyTargets) {
        const btn = page.getByRole("button", { name: new RegExp(`^${name},`, "i") });
        await btn.click();
        await page.waitForTimeout(1100);
      }
    },
    800,
  );

  // Plate gather: land and hold while station morph gathers
  await measurePhase(
    "plate-gather-aimed",
    async () => {
      await page.getByRole("button", { name: /^Leo,/i }).click();
    },
    5000,
  );

  // BirthChat slide: claim sign → dock phase (no forge AI)
  await measurePhase(
    "birthchat-slide",
    async () => {
      // Ensure moved so claim button enables
      await page.getByRole("button", { name: /^Virgo,/i }).click();
      await page.waitForTimeout(700);
      const claim = page.getByRole("button", { name: /this is my sign/i });
      await claim.waitFor({ state: "visible", timeout: 10000 });
      await claim.click();
      // BirthChat dock should appear
      await page.waitForTimeout(500);
      const dockHint = page.getByText(/when|born|name|place|birth/i).first();
      await dockHint.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    },
    3500,
  );

  const raw = await page.evaluate(() => {
    cancelAnimationFrame(window.__bar1._raf);
    try {
      window.__bar1._obs?.disconnect();
    } catch {
      /* */
    }
    return {
      frames: window.__bar1.frames,
      longTasks: window.__bar1.longTasks,
    };
  });

  const phaseStats = {};
  for (const p of phases) {
    const slice = raw.frames.slice(p.frameStart, p.frameEnd);
    const longs = raw.longTasks.slice(p.longStart, p.longEnd);
    phaseStats[p.name] = {
      ...p,
      frames: summarize(slice, p.elapsedMs),
      longTasksOver50: longs.filter((t) => t.duration > 50).length,
      longTaskMaxMs: longs.reduce((m, t) => Math.max(m, t.duration), 0),
    };
  }

  const hotNames = ["fly-sign-travel", "plate-gather-aimed", "birthchat-slide"];
  const hotFrames = [];
  let hotWall = 0;
  const hotLongs = [];
  for (const name of hotNames) {
    const p = phases.find((x) => x.name === name);
    if (!p) continue;
    hotFrames.push(...raw.frames.slice(p.frameStart, p.frameEnd));
    hotWall += p.elapsedMs;
    hotLongs.push(...raw.longTasks.slice(p.longStart, p.longEnd));
  }

  const allWall = phases.reduce((s, p) => s + p.elapsedMs, 0);
  const allFrames = summarize(raw.frames, allWall);
  const hotPath = summarize(hotFrames, hotWall);
  const longTasksOver50 = raw.longTasks.filter((t) => t.duration > 50);
  const hotLongOver50 = hotLongs.filter((t) => t.duration > 50);
  const longTaskMax = raw.longTasks.reduce((m, t) => Math.max(m, t.duration), 0);

  const hotAvgOk = Boolean(hotPath && hotPath.avgMs <= 16.7);
  const hotLongOk = hotLongOver50.length === 0;
  const exercised =
    (phaseStats["fly-sign-travel"]?.frames?.samples ?? 0) > 100 &&
    (phaseStats["plate-gather-aimed"]?.frames?.samples ?? 0) > 100;

  const verdict =
    !hotPath || hotPath.samples < 60 || !exercised
      ? "FAIL-INCONCLUSIVE"
      : hotAvgOk && hotLongOk
        ? "PASS"
        : "FAIL";

  let largestGap = null;
  if (verdict === "FAIL") {
    if (!hotLongOk) {
      largestGap = `Long task ${Math.max(...hotLongOver50.map((t) => t.duration)).toFixed(0)}ms on hot path (BirthChat slide / fly) — main-thread blocking >50ms`;
    } else if (hotPath && hotPath.over50 > 0) {
      largestGap = `Dropped frames up to ${hotPath.maxMs}ms (rAF) during fly/gather/BirthChat — still missing 60fps budget`;
    } else if (hotPath && hotPath.avgMs > 16.7) {
      largestGap = `Hot-path avg frame ${hotPath.avgMs}ms > 16.7ms (mid-phone 4× CPU, 390×844)`;
    } else {
      largestGap = "BAR(1) unmet on fly + gather + BirthChat slide";
    }
  }

  const report = {
    ok: verdict === "PASS",
    verdict,
    largestGap,
    bar: { avgFrameMsLimit: 16.7, longTaskMsLimit: 50 },
    conditions: {
      url,
      viewport: VIEWPORT,
      cpuThrottleRate: cpuThrottle,
      browser: "playwright-chromium",
      headless: true,
      profile: "mid-phone proxy: 390×844 + CDP Emulation.setCPUThrottlingRate",
      note: "rAF deltas = presentation pacing; spikes/longtasks = jank under throttle",
      signButtons: count,
      flyTargets,
    },
    allFrames,
    hotPath,
    phaseStats,
    longTasks: {
      count: raw.longTasks.length,
      over50Count: longTasksOver50.length,
      hotPathOver50Count: hotLongOver50.length,
      maxMs: Number(longTaskMax.toFixed(3)),
      over50: longTasksOver50.slice(0, 20),
    },
    barChecks: {
      hotPathAvgLe16_7: hotAvgOk,
      noHotPathLongTaskOver50: hotLongOk,
      flyAndGatherExercised: exercised,
    },
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  process.exit(verdict === "PASS" ? 0 : 1);
}

main().catch((err) => {
  console.error(
    JSON.stringify(
      { ok: false, verdict: "FAIL-INCONCLUSIVE", error: String(err?.stack || err) },
      null,
      2,
    ),
  );
  process.exit(2);
});
