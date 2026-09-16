/**
 * Skip-path check: the soft blackout must read as deliberate, then the hub must
 * rise with the galaxy already in place (the old failure was an empty flash).
 *
 *   node scripts/qa/skip-check.mjs [signIndex]
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const signIndex = Number(process.argv[2] ?? 8);
const outDir = `screenshots/skip-${signIndex}`;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on("pageerror", (e) => problems.push(String(e.message).slice(0, 200)));

await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 30_000 });
await page.waitForTimeout(1000);
const parked = await page.evaluate((i) => {
  window.__tysQa.ready();
  return window.__tysQa.parkAt(i);
}, signIndex);
await page
  .waitForFunction((w) => Math.abs(window.__tysQa.state().t - w) < 0.004, parked.target, { timeout: 6000 })
  .catch(() => {});
await page.waitForTimeout(500);
await page.evaluate((i) => window.__tysQa.enter(i), signIndex);
await page.waitForTimeout(1000); // mid-dive
const skipped = await page.evaluate(() => window.__tysQa.skip());

const shots = [0, 200, 500, 800, 1200, 1700];
const rows = [];
let t = 0;
for (const at of shots) {
  if (at > t) await page.waitForTimeout(at - t);
  t = at;
  const s = await page.evaluate(() => {
    const st = window.__tysQa.state();
    const veil = document.querySelector('[style*="opacity"]');
    return { phase: st.phase, p: +st.p.toFixed(3), veilSample: veil ? getComputedStyle(veil).opacity : null };
  });
  rows.push({ at, ...s });
  await page.screenshot({ path: `${outDir}/skip_${String(at).padStart(4, "0")}.png` });
}
console.log(JSON.stringify({ skipped, rows, problems }, null, 2));
await browser.close();