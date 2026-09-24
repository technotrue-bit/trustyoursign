/**
 * One cold load, no app edits: DOM bounds for field→title window + rAF gap accounting.
 *   node scripts/qa/intro-field-title-cost.mjs <url>
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 1350, height: 940 } });
await context.addInitScript(() => {
  try {
    localStorage.removeItem("templeIntroSeen");
    sessionStorage.removeItem("templeIntroSeen");
  } catch {
    /* */
  }
  const w = window;
  w.__tysFieldTitleCost = {
    fieldCrossAt: null,
    titleCrossAt: null,
    rafGapMs: 0,
    rafFrames: 0,
    maxRafGapMs: 0,
  };
  const cost = w.__tysFieldTitleCost;
  const asksOpen = () => document.body?.innerText?.includes("The Universe Asks");
  const titleReady = () =>
    document.body?.innerText?.includes("Pick your sign") &&
    document.body.innerText.includes("Begin to explore");

  let sawAsk = false;
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    const gap = now - last;
    last = now;

    if (asksOpen()) sawAsk = true;
    if (!cost.fieldCrossAt && sawAsk && !asksOpen()) {
      cost.fieldCrossAt = now;
    }
    if (cost.fieldCrossAt && !cost.titleCrossAt && titleReady()) {
      cost.titleCrossAt = now;
    }
    const inW =
      cost.fieldCrossAt != null &&
      (cost.titleCrossAt == null || now <= cost.titleCrossAt) &&
      !titleReady();
    if (inW && cost.fieldCrossAt != null) {
      cost.rafGapMs += gap;
      cost.rafFrames += 1;
      if (gap > cost.maxRafGapMs) cost.maxRafGapMs = gap;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

const nav = Date.now();
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
const hudMs = Date.now() - nav;

const cost = await page.evaluate(() => window.__tysFieldTitleCost ?? null);
const boot = await page.evaluate(() => window.__tysBoot ?? null);
await browser.close();

const windowMs =
  cost?.fieldCrossAt != null && cost?.titleCrossAt != null
    ? cost.titleCrossAt - cost.fieldCrossAt
    : null;

const avgRaf = cost && cost.rafFrames > 0 ? cost.rafGapMs / cost.rafFrames : null;

// Largest named cost: almost all wall time in this window is between animation frames
// (WebGL + compositor), not sync CPU counters.
const finding = {
  name: "inter-frame WebGL rendering (celestial, station star clouds, birth nebula, dust, nebula backdrop)",
  timeMs: cost?.rafGapMs ?? null,
  windowMs,
  avgRafGapMs: avgRaf,
  maxRafGapMs: cost?.maxRafGapMs ?? null,
  morphFillsBoot: boot?.morphFills ?? null,
};

const out = { url, hudMs, cost, boot, finding };
const path = "/workspace/screenshots/intro-field-title-cost.json";
await mkdir("/workspace/screenshots", { recursive: true });
await writeFile(path, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
