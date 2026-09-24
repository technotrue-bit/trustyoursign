import { mkdir, copyFile } from "node:fs/promises";
import { chromium } from "playwright";

const storeDir = "/cursor/stores/bc-94162dc9-7018-48da-a5a0-9bf7e81bd591/media/capricorn-inside";
await mkdir(storeDir, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const problems = [];
page.on("pageerror", (e) => problems.push(String(e.message)));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(m.text());
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => Boolean(window.__tysQa), null, { timeout: 30_000 });
await page.evaluate(() => window.__tysQa.ready());
await page.evaluate((id) => window.__tysQa.preload(id), "capricorn");
await page.waitForTimeout(2500);

const capIdx = await page.evaluate(() => window.__tysQa.signIndex("capricorn"));
await page.evaluate((idx) => window.__tysQa.parkAt(idx), capIdx);
await page.waitForTimeout(2000);
await page.evaluate((idx) => window.__tysQa.enter(idx), capIdx);
await page.waitForFunction(() => window.__tysQa.state().phase === "inside", null, { timeout: 15000 });
await page.waitForTimeout(1200);

const insideState = await page.evaluate(() => window.__tysQa.state());
const insidePath = `${storeDir}/inside.png`;
await page.screenshot({ path: insidePath, type: "png" });

await page.evaluate(async () => {
  const { leaveSignGalaxy } = await import("/src/lib/galaxy/travel.ts");
  leaveSignGalaxy();
});
await page.waitForFunction(() => window.__tysQa.state().phase === "idle", null, { timeout: 15000 });
await page.waitForTimeout(1800);
const backPath = `${storeDir}/back-home.png`;
await page.screenshot({ path: backPath, type: "png" });

console.log(JSON.stringify({ insideState, problems, insidePath, backPath }, null, 2));
await browser.close();
