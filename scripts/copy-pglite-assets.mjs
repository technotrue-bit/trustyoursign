#!/usr/bin/env node
/**
 * Nitro's vercel build often omits PGLite binary assets that the preview
 * server needs when DATABASE_URL is unset. Copy them next to the bundled
 * electric-sql__pglite chunk so `npm run preview` can boot.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@electric-sql/pglite/dist");
const dst = join(root, ".vercel/output/functions/__server.func/_libs");

if (!existsSync(src) || !existsSync(dirname(dst))) {
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
for (const name of readdirSync(src)) {
  if (!name.endsWith(".wasm") && !name.endsWith(".data")) continue;
  copyFileSync(join(src, name), join(dst, name));
}
