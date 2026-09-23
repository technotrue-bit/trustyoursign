/**
 * Round 2/3 real-network cold-load timings (median of 5 runs).
 *   node scripts/qa/site-speed-measure.mjs <url> [label]
 */
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://trustyoursign.com/";
const label = process.argv[3] ?? "run";
const RUNS = 5;

const MOBILE = { download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8, latency: 150 };

async function oneRun(page, profile) {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (profile === "mobile") {
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      ...MOBILE,
    });
  } else {
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      download: -1,
      upload: -1,
      latency: 0,
    });
  }
  if (profile === "desktop-throttle") {
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  } else {
    await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }

  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const fcp = await page.evaluate(() => {
    const e = performance.getEntriesByName("first-contentful-paint")[0];
    return e ? e.startTime : null;
  });
  await page
    .waitForFunction(
      () => document.body?.innerText?.includes("Pick your sign") && document.body.innerText.includes("Begin to explore"),
      null,
      { timeout: 120_000 },
    )
    .catch(() => {});
  const skyAt = Date.now() - t0;
  const plateAt = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource");
    const hit = entries.find((e) => /\/signs\/aries\.(webp|png)/.test(e.name) && e.responseEnd > 0);
    return hit ? hit.responseEnd : null;
  });
  const bytes = await page.evaluate(() =>
    performance.getEntriesByType("resource").reduce((acc, e) => acc + (e.transferSize || 0), 0),
  );

  const trace = await client.send("Tracing.start", {
    categories: ["devtools.timeline", "disabled-by-default-v8.cpu_profiler"],
    options: "sampling",
    transferMode: "ReturnAsStream",
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(
      () => document.body?.innerText?.includes("Pick your sign") && document.body.innerText.includes("Begin to explore"),
      null,
      { timeout: 120_000 },
    )
    .catch(() => {});
  await client.send("Tracing.end");
  const end = await client.send("Tracing.end");
  const stream = end.stream;
  let traceJson = "";
  if (stream) {
    const chunks = await client.send("IO.read", { handle: stream, size: 10_000_000 });
    traceJson = chunks.data;
    await client.send("IO.close", { handle: stream });
  }
  let composeMs = 0;
  let drawPlacementMs = 0;
  try {
    const events = JSON.parse(traceJson.includes("[") ? traceJson : `[]`);
    const parsed = Array.isArray(events) ? events : [];
    for (const ev of parsed) {
      if (ev.ph !== "X" || !ev.name) continue;
      if (ev.name.includes("composeNebulaWallpaper")) composeMs += ev.dur / 1000;
      if (ev.name.includes("drawPlacement")) drawPlacementMs += ev.dur / 1000;
    }
  } catch {
    /* trace parse best-effort */
  }

  return { fcp, skyAt, plateAt, bytes, composeMs, drawPlacementMs };
}

function median(nums) {
  const s = nums.filter((n) => n != null && Number.isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const out = { url, label, profiles: {} };

for (const profile of ["mobile", "desktop", "desktop-throttle"]) {
  const rows = [];
  for (let i = 0; i < RUNS; i++) {
    const context = await browser.newContext(
      profile === "mobile"
        ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true }
        : { viewport: { width: 1350, height: 940 } },
    );
    const page = await context.newPage();
    rows.push(await oneRun(page, profile));
    await context.close();
  }
  out.profiles[profile] = {
    runs: rows,
    median: {
      fcp: median(rows.map((r) => r.fcp)),
      skyAt: median(rows.map((r) => r.skyAt)),
      plateAt: median(rows.map((r) => r.plateAt)),
      bytes: median(rows.map((r) => r.bytes)),
      composeMs: median(rows.map((r) => r.composeMs)),
      drawPlacementMs: median(rows.map((r) => r.drawPlacementMs)),
    },
  };
}

await browser.close();
const path = `/workspace/screenshots/site-speed-${label}.json`;
await writeFile(path, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
