/** One-shot page diagnostics: does the 3D scene mount, and what does it say? */
import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const log = [];
page.on("console", (m) => log.push(`[${m.type()}] ${m.text().slice(0, 400)}`));
page.on("pageerror", (e) => log.push(`[pageerror] ${(e.stack ?? e.message).slice(0, 900)}`));

await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

const info = await page.evaluate(async () => {
  const out = {
    canvases: document.querySelectorAll("canvas").length,
    canvasRoot: Boolean(document.querySelector(".canvas-root")),
    mainText: (document.querySelector("main")?.innerText ?? "").slice(0, 120),
    probe: window.__tys ?? null,
  };
  try {
    const travel = await import("/src/lib/galaxy/travel.ts");
    out.travel = { t: travel.galaxyTravel.t, phase: travel.galaxyTravel.explorePhase };
  } catch (e) {
    out.travelError = String(e).slice(0, 300);
  }
  return out;
});

console.log(JSON.stringify(info, null, 2));
console.log("--- console ---");
console.log(log.slice(0, 40).join("\n"));
await browser.close();
