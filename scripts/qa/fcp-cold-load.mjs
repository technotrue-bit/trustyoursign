/**
 * Median of 5 cold mobile FCP runs (real throttled network).
 *   node scripts/qa/fcp-cold-load.mjs <url> [label]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2];
const label = process.argv[3] ?? "run";
const RUNS = 5;
const MOBILE = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};

function median(nums) {
  const s = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const fcps = [];

for (let i = 0; i < RUNS; i++) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", MOBILE);
  await page.goto(url, { waitUntil: "load", timeout: 120_000 });
  const fcp = await page.evaluate(() => {
    const paints = performance.getEntriesByType("paint");
    const fcpHit = paints.find((e) => e.name === "first-contentful-paint");
    if (fcpHit) return fcpHit.startTime;
    const fp = paints.find((e) => e.name === "first-paint");
    return fp ? fp.startTime : null;
  });
  fcps.push(fcp);
  await context.close();
}

await browser.close();
const out = { url, label, runs: fcps, medianFcpMs: median(fcps) };
const path = `/workspace/screenshots/fcp-${label}.json`;
await mkdir("/workspace/screenshots", { recursive: true });
await writeFile(path, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
