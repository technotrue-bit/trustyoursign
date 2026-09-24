/**
 * Cold boot: station cloud + volume build cost until HUD-ready (same window as desktop-boot-trace).
 *   node scripts/qa/station-cloud-boot-trace.mjs <url> [label] [cpuThrottle]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2];
const label = process.argv[3] ?? "run";
const cpuRate = Number(process.argv[4] ?? 1);
const RUNS = 5;

const CLOUD_RE =
  /denseCloud|interiorCloud|fillMorphCloud|fillStationCloud|getSignVolume|primeSignVolumes|primeSignVolumeNear|signVolume\.ts|starRender\.ts/i;

function median(nums) {
  const s = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function oneRun() {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const context = await browser.newContext({ viewport: { width: 1350, height: 940 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (cpuRate > 1) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  }
  await cdp.send("Tracing.start", {
    traceConfig: {
      recordMode: "recordUntilFull",
      includedCategories: ["devtools.timeline", "disabled-by-default-v8.cpu_profiler"],
    },
    transferMode: "ReturnAsStream",
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page
    .waitForFunction(
      () =>
        document.body?.innerText?.includes("Pick your sign") &&
        document.body.innerText.includes("Begin to explore"),
      null,
      { timeout: 120_000 },
    )
    .catch(() => {});
  const hudMs = Date.now() - t0;
  const boot = await page.evaluate(() => {
    const b = window.__tysBoot;
    return b ? { morphFills: b.morphFills ?? 0, volumeBuilds: b.volumeBuilds ?? 0 } : null;
  });
  const end = await cdp.send("Tracing.end");
  let cloudSelfMs = 0;
  let volumeBuildMs = 0;
  let longTasksMs = 0;
  let longTaskCount = 0;
  if (end.stream) {
    let data = "";
    let eof = false;
    while (!eof) {
      const chunk = await cdp.send("IO.read", { handle: end.stream, size: 1_000_000 });
      data += chunk.data;
      eof = chunk.eof;
    }
    await cdp.send("IO.close", { handle: end.stream });
    for (const line of data.split("\n")) {
      if (!line.trim()) continue;
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      if (ev.ph === "X" && ev.dur) {
        const name = ev.name ?? "";
        const cat = ev.cat ?? "";
        const blob = `${name} ${cat}`;
        if (CLOUD_RE.test(blob)) cloudSelfMs += ev.dur / 1000;
        if (/signVolume|function build\b/i.test(blob)) volumeBuildMs += ev.dur / 1000;
        if (name === "RunTask" && ev.dur >= 50_000) {
          longTasksMs += ev.dur / 1000;
          longTaskCount += 1;
        }
      }
    }
  }
  await browser.close();
  return {
    hudMs,
    morphFills: boot?.morphFills ?? null,
    volumeBuilds: boot?.volumeBuilds ?? null,
    cloudSelfMs,
    volumeBuildMs,
    longTasksMs,
    longTaskCount,
  };
}

const rows = [];
for (let i = 0; i < RUNS; i++) rows.push(await oneRun());
const out = {
  url,
  label,
  cpuRate,
  runs: rows,
  median: {
    hudMs: median(rows.map((r) => r.hudMs)),
    morphFills: median(rows.map((r) => r.morphFills)),
    volumeBuilds: median(rows.map((r) => r.volumeBuilds)),
    cloudSelfMs: median(rows.map((r) => r.cloudSelfMs)),
    volumeBuildMs: median(rows.map((r) => r.volumeBuildMs)),
    longTasksMs: median(rows.map((r) => r.longTasksMs)),
    longTaskCount: median(rows.map((r) => r.longTaskCount)),
  },
};
const path = `/workspace/screenshots/station-cloud-trace-${label}.json`;
await mkdir("/workspace/screenshots", { recursive: true });
await writeFile(path, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
