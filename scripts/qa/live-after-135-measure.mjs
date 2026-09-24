/**
 * Live production audit (post-#135), same shape as live-after-132-raw.json.
 *   node scripts/qa/live-after-135-measure.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const BASE = "https://trustyoursign.com/";
const RUNS = 5;
const CHROME_FLAGS = [
  "--headless=new",
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--no-sandbox",
  "--disable-gpu-sandbox",
];

const MOBILE = {
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};

function median(nums) {
  const s = nums.filter((n) => n != null && Number.isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function bytesFromLh(lhr) {
  const items = lhr.audits["network-requests"]?.details?.items ?? [];
  let script = 0;
  let image = 0;
  let font = 0;
  for (const it of items) {
    const t = (it.resourceType || "").toLowerCase();
    const b = it.transferSize ?? 0;
    if (t === "script") script += b;
    else if (t === "image") image += b;
    else if (t === "font") font += b;
  }
  return { script, image, font };
}

function lhRow(lhr) {
  const a = lhr.audits;
  const bb = bytesFromLh(lhr);
  return {
    score: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    lcp: (a["largest-contentful-paint"]?.numericValue ?? 0) / 1000,
    fcp: (a["first-contentful-paint"]?.numericValue ?? 0) / 1000,
    tbt: (a["total-blocking-time"]?.numericValue ?? 0) / 1000,
    cls: a["cumulative-layout-shift"]?.numericValue ?? 0,
    speedIndex: (a["speed-index"]?.numericValue ?? 0) / 1000,
    transferBytes: a["total-byte-weight"]?.numericValue ?? 0,
    scriptBytes: bb.script,
    imageBytes: bb.image,
    fontBytes: bb.font,
  };
}

async function runLighthouse(profile, i) {
  const url = `${BASE}?lh=135-${profile}-${i}-${Date.now()}`;
  const chrome = await chromeLauncher.launch({ chromeFlags: CHROME_FLAGS });
  const options = {
    logLevel: "error",
    output: "json",
    port: chrome.port,
    onlyCategories: ["performance"],
    formFactor: profile === "mobile" ? "mobile" : "desktop",
    screenEmulation:
      profile === "mobile"
        ? { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false }
        : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
  };
  const runner = await lighthouse(url, options);
  await chrome.kill();
  return { url, ...lhRow(runner.lhr) };
}

async function oneColdLoad(page, profile) {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (profile === "mobile") {
    await client.send("Network.emulateNetworkConditions", { offline: false, ...MOBILE });
  } else {
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  }
  await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  const bust = `rn135=${Date.now()}`;
  const t0 = Date.now();
  await page.goto(`${BASE}?${bust}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const fcpMs = await page.evaluate(() => {
    const e = performance.getEntriesByName("first-contentful-paint")[0];
    if (e) return e.startTime;
    const fp = performance.getEntriesByName("first-paint")[0];
    return fp ? fp.startTime : null;
  });
  await page
    .waitForFunction(
      () =>
        document.body?.innerText?.includes("Pick your sign") &&
        document.body.innerText.includes("Begin to explore"),
      null,
      { timeout: 120_000 },
    )
    .catch(() => {});
  const skyAt = Date.now() - t0;
  const plateAt = await page.evaluate(() => {
    const hit = performance
      .getEntriesByType("resource")
      .find((e) => /\/signs\/aries\.(webp|png)/.test(e.name) && e.responseEnd > 0);
    return hit ? hit.responseEnd : null;
  });
  const bytes = await page.evaluate(() =>
    performance.getEntriesByType("resource").reduce((a, e) => a + (e.transferSize || 0), 0),
  );
  return { fcpMs, skyAt, plateAt, bytes };
}

async function screenshot(profile, outPath) {
  const browser = await chromium.launch({ args: CHROME_FLAGS });
  const context = await browser.newContext(
    profile === "mobile"
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true }
      : { viewport: { width: 1350, height: 940 } },
  );
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (profile === "mobile") {
    await client.send("Network.emulateNetworkConditions", { offline: false, ...MOBILE });
  }
  await page.goto(`${BASE}?shot=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () =>
      document.body?.innerText?.includes("Pick your sign") &&
      document.body.innerText.includes("Begin to explore"),
    null,
    { timeout: 120_000 },
  );
  await mkdir(outPath.replace(/\/[^/]+$/, ""), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: false });
  await browser.close();
}

const out = {
  measuredAt: new Date().toISOString(),
  deploy: { productionRoutes: "routes-CplHZrIo.js", pr: "135 merged (site v0.31)" },
  base: BASE,
  runs: RUNS,
  mobile: { lighthouse: { runs: [], median: {} }, realNetwork: { runs: [], median: {} } },
  desktop: { lighthouse: { runs: [], median: {} }, realNetwork: { runs: [], median: {} } },
};

for (const profile of ["mobile", "desktop"]) {
  for (let i = 0; i < RUNS; i++) {
    out[profile].lighthouse.runs.push(await runLighthouse(profile, i));
  }
  const lhRuns = out[profile].lighthouse.runs;
  out[profile].lighthouse.median = {
    score: median(lhRuns.map((r) => r.score)),
    lcp: median(lhRuns.map((r) => r.lcp)),
    fcp: median(lhRuns.map((r) => r.fcp)),
    tbt: median(lhRuns.map((r) => r.tbt)),
    cls: median(lhRuns.map((r) => r.cls)),
    speedIndex: median(lhRuns.map((r) => r.speedIndex)),
    transferBytes: median(lhRuns.map((r) => r.transferBytes)),
    scriptBytes: median(lhRuns.map((r) => r.scriptBytes)),
    imageBytes: median(lhRuns.map((r) => r.imageBytes)),
    fontBytes: median(lhRuns.map((r) => r.fontBytes)),
  };

  const browser = await chromium.launch({ args: CHROME_FLAGS });
  for (let i = 0; i < RUNS; i++) {
    const context = await browser.newContext(
      profile === "mobile"
        ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true }
        : { viewport: { width: 1350, height: 940 } },
    );
    const page = await context.newPage();
    out[profile].realNetwork.runs.push(await oneColdLoad(page, profile));
    await context.close();
  }
  await browser.close();
  const rn = out[profile].realNetwork.runs;
  out[profile].realNetwork.median = {
    fcpMs: median(rn.map((r) => r.fcpMs)),
    skyAt: median(rn.map((r) => r.skyAt)),
    plateAt: median(rn.map((r) => r.plateAt)),
    bytes: median(rn.map((r) => r.bytes)),
  };
}

const storeBase = "/cursor/stores/bc-94162dc9-7018-48da-a5a0-9bf7e81bd591";
await screenshot("mobile", `${storeBase}/media/site-speed/live-after-135-phone.png`);
await screenshot("desktop", `${storeBase}/media/site-speed/live-after-135-desktop.png`);

const rawPath = `${storeBase}/internal/site-speed/live-after-135-raw.json`;
await mkdir(rawPath.replace(/\/[^/]+$/, ""), { recursive: true });
await writeFile(rawPath, JSON.stringify(out, null, 2));
await writeFile("/workspace/screenshots/live-after-135-raw.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
