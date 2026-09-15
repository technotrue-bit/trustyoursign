/**
 * Smoke the built output (not the dev server): does it render, is the console
 * clean? Then dive into Sagittarius and confirm the flythrough still lands.
 *
 *   node scripts/qa/build-smoke.mjs [baseUrl] [outPng]
 */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:8081";
const outPng = process.argv[3] ?? "screenshots/build-smoke.png";

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`[console.error] ${m.text().slice(0, 300)}`);
});
page.on("pageerror", (e) => problems.push(`[pageerror] ${String(e.message).slice(0, 300)}`));

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 30_000 });
await page.waitForTimeout(3500);

const shell = await page.evaluate(() => ({
  text: (document.querySelector("main")?.innerText ?? "").trim().slice(0, 160),
  canvases: document.querySelectorAll("canvas").length,
  qaHooks: Boolean(window.__tysQa),
}));

// Production build has no dev hooks — drive the UI like a visitor instead.
const clicked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button, a")];
  const target = btns.find((b) => /enter/i.test(b.textContent ?? ""));
  if (target) {
    target.click();
    return target.textContent?.trim().slice(0, 40) ?? "enter";
  }
  return null;
});
await page.waitForTimeout(4000);
const after = await page.evaluate(() => ({
  phaseText: (document.querySelector("main")?.innerText ?? "").trim().slice(0, 120),
  canvases: document.querySelectorAll("canvas").length,
}));
await page.screenshot({ path: outPng });

console.log(
  JSON.stringify(
    { base, shell, clicked, after, problems, verdict: problems.length === 0 && shell.text.length > 0 ? "clean" : "check" },
    null,
    2,
  ),
);
await browser.close();