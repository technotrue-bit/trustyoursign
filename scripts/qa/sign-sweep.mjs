/**
 * Sweep all 12 signs: park, measure the hand-off alignment, dive, land — and
 * report whether the shared pipeline lands each sign the same way.
 *
 *   node scripts/qa/sign-sweep.mjs [outDir]
 *
 * Verification only: this never writes sign art or per-sign tuning. It records
 * the measured boxes/alignment, the landing geometry, a mid-dive frame (the
 * painting→stars hand-off) and a landed frame for every sign.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "screenshots/sweep";
const SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];
const VIEW = { width: 960, height: 540 };

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: VIEW });
const problems = [];
page.on("pageerror", (e) => problems.push(`[pageerror] ${String(e.message).slice(0, 160)}`));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`[console] ${m.text().slice(0, 160)}`);
});

await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 30_000 });
await page.waitForTimeout(1200);
// Warm every plate PNG so the alignment boxes can be measured for all signs.
await page.evaluate(() => window.__tysQa.ready());
for (const id of SIGNS) {
  await page.evaluate((signId) => window.__tysQa.preload(signId), id);
}
await page.waitForTimeout(2500);

const rows = [];
for (let i = 0; i < SIGNS.length; i++) {
  const id = SIGNS[i];
  const before = problems.length;
  const parked = await page.evaluate((idx) => {
    window.__tysQa.ready();
    return window.__tysQa.parkAt(idx);
  }, i);
  await page
    .waitForFunction((w) => Math.abs(window.__tysQa.state().t - w) < 0.005, parked.target, { timeout: 8000 })
    .catch(() => {});

  const align = await page.evaluate((signId) => window.__tysQa.align(signId), id);

  await page.evaluate((idx) => window.__tysQa.enter(idx), i);
  // Mid-dive: the painting → live-figure hand-off.
  await page
    .waitForFunction(() => window.__tysQa.state().p > 0.55, null, { timeout: 8000 })
    .catch(() => {});
  await page.screenshot({ path: `${outDir}/${String(i).padStart(2, "0")}-${id}-mid.png` });
  const midState = await page.evaluate(() => window.__tysQa.state());

  await page
    .waitForFunction(() => window.__tysQa.state().phase === "inside", null, { timeout: 12_000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  const landed = await page.evaluate(() => window.__tysQa.state());
  await page.screenshot({ path: `${outDir}/${String(i).padStart(2, "0")}-${id}-landed.png` });

  rows.push({
    id,
    index: i,
    reachedInside: landed.phase === "inside",
    fieldBox: align.field,
    paintedBox: align.painted,
    match: align.match,
    midP: +midState.p.toFixed(2),
    camToHub: landed.probe?.camToHub ?? null,
    ndcX: landed.probe?.hubNdcX ?? null,
    ndcY: landed.probe?.hubNdcY ?? null,
    fov: landed.probe?.fov ?? null,
    problems: problems.slice(before),
  });
  process.stdout.write(`${String(i).padStart(2, "0")} ${id.padEnd(12)} ok=${landed.phase === "inside"} camToHub=${rows.at(-1).camToHub} ndc=(${rows.at(-1).ndcX},${rows.at(-1).ndcY})\n`);
}

await writeFile(`${outDir}/sweep.json`, JSON.stringify({ view: VIEW, rows, problems }, null, 2));
const aligned = rows.filter((r) => r.match).length;
const landedOk = rows.filter((r) => r.reachedInside).length;
const centred = rows.filter((r) => r.ndcX != null && Math.abs(r.ndcX) < 0.25 && Math.abs(r.ndcY) < 0.25).length;
console.log(
  JSON.stringify(
    {
      signs: rows.length,
      reachedInside: landedOk,
      alignmentResolved: aligned,
      centredCore: centred,
      camToHub: rows.map((r) => r.camToHub),
      totalProblems: problems.length,
      problems: problems.slice(0, 10),
    },
    null,
    2,
  ),
);
await browser.close();