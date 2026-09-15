/**
 * Capture the sign-enter dive from the live dev server, frame by frame.
 *
 *   node scripts/qa/enter-capture.mjs [signIndex] [outDir] [extraShotMs,ms,...]
 *
 * Drives the app through its own dev-only hooks (`window.__tysQa`, installed by
 * `src/lib/dev-qa.ts`) so the capture exercises the shipping animation and the
 * same module instance the browser is running — not a second import of it.
 *
 * Parks the camera on the sign first: the product's entry point is "you already
 * flew here, now tap Enter this sign". Writes PNGs + a state JSON.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://localhost:8080";
const signIndex = Number(process.argv[2] ?? 8); // 8 = Sagittarius (Aries-first)
const outDir = process.argv[3] ?? `screenshots/enter-${signIndex}`;
const extra = (process.argv[4] ?? "").split(",").map(Number).filter((n) => Number.isFinite(n));
const shootAt = [0, 150, 350, 600, 900, 1200, 1600, 2000, 2400, 2800, 3200, 3600, 4000, 4300, 4600, 5200, ...extra]
  .filter((v, i, a) => a.indexOf(v) === i)
  .sort((a, b) => a - b);

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") problems.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 30_000 });
await page.waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 30_000 });
await page.waitForTimeout(1200);

const parked = await page.evaluate((idx) => {
  window.__tysQa.ready();
  return window.__tysQa.parkAt(idx);
}, signIndex);

// Let the seek land: wait until the camera is on the station (or give up).
await page
  .waitForFunction(
    (want) => Math.abs(window.__tysQa.state().t - want) < 0.004,
    parked.target,
    { timeout: 6000 },
  )
  .catch(() => {});
await page.waitForTimeout(600);

// The resting station — what the visitor sees before tapping Enter.
await page.screenshot({ path: `${outDir}/f_pre.png` });

const armed = await page.evaluate((idx) => {
  const before = window.__tysQa.state();
  const ok = window.__tysQa.enter(idx);
  return { ok, t: before.t, target: before.tTarget };
}, signIndex);

const states = [];
let t = 0;
for (const at of shootAt) {
  const wait = at - t;
  if (wait > 0) await page.waitForTimeout(wait);
  t = at;
  const state = await page.evaluate(() => window.__tysQa.state());
  const { probe, ...rest } = state;
  states.push({ at, ...rest, camToHub: probe?.camToHub ?? null, camZ: probe?.camZ ?? null, fov: probe?.fov ?? null });
  await page.screenshot({ path: `${outDir}/f_${String(at).padStart(5, "0")}.png` });
}

await writeFile(`${outDir}/states.json`, JSON.stringify({ parked, armed, shootAt, states, problems }, null, 2));
console.log(JSON.stringify({ parked, armed, problems: problems.slice(0, 8) }, null, 2));
console.table(states);
await browser.close();
