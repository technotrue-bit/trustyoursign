/**
 * Dev-only Playwright harness for nebula wallpaper baking (not served in production).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const HARNESS_HTML = join(dir, "fixtures", "nebula-bake-harness.html");
export const NEBULA_BAKE_HARNESS_PATH = "/__nebula-bake-harness";

/** Fulfill the harness HTML without putting it under public/. */
export async function installNebulaBakeHarness(page) {
  const html = await readFile(HARNESS_HTML, "utf8");
  await page.route(`**${NEBULA_BAKE_HARNESS_PATH}`, (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }),
  );
}

export function nebulaBakeHarnessUrl(base) {
  return `${base.replace(/\/$/, "")}${NEBULA_BAKE_HARNESS_PATH}`;
}
