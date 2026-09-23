/**
 * Main-thread ms for nebula wallpaper: runtime bake vs static asset load.
 *   node scripts/qa/nebula-startup-profile.mjs <base-url>
 */
import { chromium } from "playwright";

const base = (process.argv[2] ?? "http://127.0.0.1:8080").replace(/\/$/, "");

const cpuRate = Number(process.argv[3] ?? 1);
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
if (cpuRate > 1) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
}
await page.goto(`${base}/__nebula-bake.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__nebulaMod));

const stats = await page.evaluate(async () => {
  const mod = window.__nebulaMod;
  const runs = 5;
  const bakeMs = [];
  const loadMs = [];
  for (let i = 0; i < runs; i++) {
    const images = await mod.loadNebulaImages(false);
    const t0 = performance.now();
    mod.composeNebulaWallpaper(images, mod.nebulaCompositeSize(false), mod.NEBULA_GL_LAYER_GAIN);
    bakeMs.push(performance.now() - t0);
    const t1 = performance.now();
    await mod.loadPrebakedNebulaWallpaper(false, "gl");
    loadMs.push(performance.now() - t1);
  }
  const med = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  return { bakeMs, loadMs, medBake: med(bakeMs), medLoad: med(loadMs) };
});

await browser.close();
console.log(JSON.stringify({ base, ...stats, savedMs: stats.medBake - stats.medLoad }, null, 2));
