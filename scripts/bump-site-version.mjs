#!/usr/bin/env node
/**
 * Bump the product version one step toward 1.0 (never onto 1.0).
 *
 * Source of truth: `export const SITE_VERSION = "0.NN"` in
 * `src/lib/site-version.ts`. Step: +0.01 (0.01 → 0.02 → … → 0.99).
 * At 0.99 (or already ≥ 1), no-op. Reaching 1.0 is a manual edit only.
 *
 * Usage:
 *   node scripts/bump-site-version.mjs           # write bump if allowed
 *   node scripts/bump-site-version.mjs --dry-run # print next, no write
 *   node scripts/bump-site-version.mjs --check   # assert file is valid
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_PATH = path.join(ROOT, "src/lib/site-version.ts");

/** Auto-bump step. Keep small so merges climb slowly toward 1.0. */
export const VERSION_STEP = 0.01;

/** Highest version auto-bump may set (never 1.0). */
export const AUTO_BUMP_CAP = 0.99;

const VERSION_LINE =
  /^export const SITE_VERSION = "([^"]+)";\s*$/m;

/**
 * @param {string} version
 * @returns {{ ok: true, value: number } | { ok: false, error: string }}
 */
export function parseSiteVersion(version) {
  if (typeof version !== "string" || !version.trim()) {
    return { ok: false, error: "version must be a non-empty string" };
  }
  const trimmed = version.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed) && !/^\d+\.\d+\.\d+$/.test(trimmed)) {
    return { ok: false, error: `invalid version shape: ${version}` };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: `version must be a non-negative number: ${version}` };
  }
  return { ok: true, value };
}

/**
 * @param {string} version
 * @returns {{ bumped: boolean, version: string, reason?: string }}
 */
export function nextSiteVersion(version) {
  const parsed = parseSiteVersion(version);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  if (parsed.value >= 1) {
    return {
      bumped: false,
      version,
      reason: "already at or past 1.0 — auto-bump refuses; edit SITE_VERSION by hand",
    };
  }
  if (parsed.value >= AUTO_BUMP_CAP - 1e-9) {
    return {
      bumped: false,
      version: formatPreOne(parsed.value) ?? version,
      reason: `at auto cap ${AUTO_BUMP_CAP.toFixed(2)} — will not climb to 1.0`,
    };
  }
  const next = Math.round((parsed.value + VERSION_STEP) * 100) / 100;
  if (next >= 1) {
    return {
      bumped: false,
      version: formatPreOne(parsed.value) ?? version,
      reason: "next step would reach 1.0 — refused",
    };
  }
  return { bumped: true, version: formatPreOne(next) ?? next.toFixed(2) };
}

/** @param {number} n */
function formatPreOne(n) {
  if (n >= 1) return null;
  return n.toFixed(2);
}

export function readSiteVersionSource(filePath = VERSION_PATH) {
  const raw = fs.readFileSync(filePath, "utf8");
  const match = raw.match(VERSION_LINE);
  if (!match) {
    throw new Error(
      'site-version.ts must contain: export const SITE_VERSION = "0.NN";',
    );
  }
  const version = match[1];
  const parsed = parseSiteVersion(version);
  if (!parsed.ok) throw new Error(parsed.error);
  return { raw, version };
}

export function writeSiteVersion(version, filePath = VERSION_PATH) {
  const { raw } = readSiteVersionSource(filePath);
  const next = raw.replace(
    VERSION_LINE,
    `export const SITE_VERSION = "${version}";`,
  );
  if (next === raw) {
    throw new Error("failed to rewrite SITE_VERSION line");
  }
  fs.writeFileSync(filePath, next, "utf8");
}

/** Test helper: write a minimal stub file with a version assignment. */
export function writeSiteVersionStub(version, filePath) {
  fs.writeFileSync(
    filePath,
    `export const SITE_VERSION = "${version}";\n`,
    "utf8",
  );
}

function main(argv = process.argv.slice(2)) {
  const dryRun = argv.includes("--dry-run");
  const checkOnly = argv.includes("--check");

  const { version } = readSiteVersionSource();
  const parsed = parseSiteVersion(version);
  assert.ok(parsed.ok, parsed.ok ? undefined : parsed.error);

  if (checkOnly) {
    console.log(`[site-version] ok — ${version}`);
    return;
  }

  const result = nextSiteVersion(version);
  if (!result.bumped) {
    console.log(`[site-version] no bump (${result.reason}) — stays ${result.version}`);
    process.exitCode = 0;
    return;
  }

  console.log(`[site-version] ${version} → ${result.version}`);
  if (dryRun) return;

  writeSiteVersion(result.version);
  console.log(`[site-version] wrote ${path.relative(ROOT, VERSION_PATH)}`);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
