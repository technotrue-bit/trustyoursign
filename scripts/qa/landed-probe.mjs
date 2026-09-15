/**
 * Fast landed-state probe: park on a sign, enter, wait for the hub, print the
 * camera/hub geometry. For tuning the landing framing without a full capture.
 *
 *   node scripts/qa/landed-probe.mjs [signIndex] [outPng]
 */
import { chromium } from "playwright";

const signIndex = Number(process.argv[2] ?? 8);
const outPng = process.argv[3] ?? `screenshots/landed-${signIndex}.png`;
const W = Number(process.env.QA_W ?? 1280);
const H = Number(process.env.QA_H ?? 720);

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
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
await page
  .waitForFunction(() => window.__tysQa.state().phase === "inside", null, { timeout: 12_000 })
  .catch(() => {});
await page.waitForTimeout(2200);
const state = await page.evaluate(() => window.__tysQa.state());
await page.screenshot({ path: outPng });
console.log(JSON.stringify({ parked, state, problems }, null, 2));
await browser.close();
