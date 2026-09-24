/**
 * Desktop cold boot: main-thread ms in nebulaBackdrop during HUD-ready window.
 *   node scripts/qa/desktop-boot-trace.mjs <url> [label] [cpuThrottle]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2];
const label = process.argv[3] ?? "run";
const cpuRate = Number(process.argv[4] ?? 1);
const RUNS = 5;

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
  const { plateAt, nebulaAt } = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    const plate = resources.find(
      (e) => /\/signs\/aries\.(webp|png)/i.test(e.name) && e.responseEnd > 0,
    );
    const nebula = resources.find(
      (e) => /nebula-wallpaper/i.test(e.name) && e.responseEnd > 0,
    );
    return {
      plateAt: plate ? plate.responseEnd : null,
      nebulaAt: nebula ? nebula.responseEnd : null,
    };
  });
  const end = await cdp.send("Tracing.end");
  let nebulaSelfMs = 0;
  let longTasksMs = 0;
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
        if (/nebulaBackdrop|composeNebulaWallpaper|drawPlacement/i.test(name)) {
          nebulaSelfMs += ev.dur / 1000;
        }
        if (name === "RunTask" && ev.dur >= 50_000) longTasksMs += ev.dur / 1000;
      }
      if (ev.ph === "P" && ev.name === "FunctionCall" && ev.args?.data?.functionName) {
        const fn = ev.args.data.functionName;
        if (/composeNebulaWallpaper|drawPlacement/.test(fn)) {
          /* paired with X events in full trace — keep X scan only */
        }
      }
    }
  }
  await browser.close();
  return { hudMs, plateAt, nebulaAt, nebulaSelfMs, longTasksMs };
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
    plateAt: median(rows.map((r) => r.plateAt)),
    nebulaAt: median(rows.map((r) => r.nebulaAt)),
    nebulaSelfMs: median(rows.map((r) => r.nebulaSelfMs)),
    longTasksMs: median(rows.map((r) => r.longTasksMs)),
  },
};
const path = `/workspace/screenshots/desktop-trace-${label}.json`;
await mkdir("/workspace/screenshots", { recursive: true });
await writeFile(path, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
