/**
 * Nitro stamps `cache-control: public, max-age=31536000, immutable` on
 * `/assets/(.*)` and then continues. A miss falls through to the app function,
 * which returns the HTML document with that header still attached. Browsers
 * keep the 404 for a year, so the next deploy's real chunk never loads and
 * the lazy sky import fails forever.
 *
 * After the filesystem handle, terminate hashed asset misses with a short
 * 404. Real files are already served by then, still immutable.
 */

const MISS_SRC = "/assets/(.*)";

/** @param {Record<string, unknown>} config */
export function patchVercelAssetMiss(config) {
  const routes = Array.isArray(config.routes) ? config.routes : [];
  const fsIdx = routes.findIndex((route) => route && route.handle === "filesystem");
  if (fsIdx < 0) return config;
  const miss = {
    src: MISS_SRC,
    status: 404,
    headers: { "cache-control": "no-store" },
  };
  const without = routes.filter(
    (route) => !(route && route.src === MISS_SRC && route.status === 404),
  );
  const fsAt = without.findIndex((route) => route && route.handle === "filesystem");
  const next = without.slice();
  next.splice(fsAt + 1, 0, miss);
  return { ...config, routes: next };
}

async function main() {
  const { readFile, writeFile } = await import("node:fs/promises");
  const { pathToFileURL } = await import("node:url");
  const invoked =
    process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
  if (!invoked) return;
  const path = new URL("../.vercel/output/config.json", import.meta.url);
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      console.log("patch-vercel-asset-miss: no .vercel/output/config.json, skipping");
      return;
    }
    throw error;
  }
  const config = JSON.parse(raw);
  const patched = patchVercelAssetMiss(config);
  await writeFile(path, JSON.stringify(patched, null, 2) + "\n");
  console.log("patch-vercel-asset-miss: missing /assets responses are no-store 404s");
}

await main();
