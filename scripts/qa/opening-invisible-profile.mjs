/**
 * One cold dev load: invisible-layer CPU sums in introField→title window.
 *   node scripts/qa/opening-invisible-profile.mjs <url> [label]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:8080/";
const label = process.argv[3] ?? "invisible";

async function oneRun() {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const context = await browser.newContext({ viewport: { width: 1350, height: 940 } });
  await context.addInitScript(() => {
    try {
      localStorage.removeItem("templeIntroSeen");
      sessionStorage.removeItem("templeIntroSeen");
    } catch {
      /* private mode */
    }
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
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
  const profile = await page.evaluate(() => {
    const p = window.__tysInvisibleOpening;
    if (!p) return null;
    let name = "";
    let ms = 0;
    for (const [k, v] of Object.entries(p.buckets ?? {})) {
      if (v > ms) {
        ms = v;
        name = k;
      }
    }
    return { ...p, largest: { name, ms } };
  });
  await browser.close();
  return { hudMs, profile };
}

const out = await oneRun();
const path = `/workspace/screenshots/opening-invisible-profile-${label}.json`;
await mkdir("/workspace/screenshots", { recursive: true });
await writeFile(path, JSON.stringify({ url, label, ...out, artifact: path }, null, 2));
console.log(JSON.stringify({ url, label, ...out, artifact: path }, null, 2));
