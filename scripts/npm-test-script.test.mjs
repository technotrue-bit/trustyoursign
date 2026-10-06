import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

function srcTestFiles(dir, prefix = "src") {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...srcTestFiles(join(dir, entry.name), rel));
    else if (entry.name.endsWith(".test.ts")) found.push(rel);
  }
  return found;
}

test("npm test passes the scripts glob to node unquoted", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const script = pkg.scripts.test;
  assert.match(script, /node --test scripts\/\*\*\/\*\.test\.mjs(?: |&&)/);
  assert.equal(script.includes("'scripts/**/*.test.mjs'"), false);
  assert.equal(script.includes('"scripts/**/*.test.mjs"'), false);
});

test("CI runs npm test and does not ignore script-suite failures", () => {
  const yml = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.match(yml, /run: npm test\n/);
  assert.equal(yml.includes("continue-on-error"), false);
  assert.equal(yml.includes("npm run test:app"), false);
});

test("share-card title is the product name", () => {
  const site = JSON.parse(
    readFileSync(new URL("../src/lib/og/site.json", import.meta.url), "utf8"),
  );
  assert.equal(site.title, "Trust Your Sign");
});

test("every src test file is named in both npm test scripts", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const files = srcTestFiles(fileURLToPath(new URL("../src", import.meta.url)));
  assert.ok(files.length > 0, "expected src/**/*.test.ts files");
  for (const scriptName of ["test", "test:app"]) {
    const listed = new Set(pkg.scripts[scriptName].split(/\s+/));
    const missing = files.filter((file) => !listed.has(file));
    assert.deepEqual(missing, [], `${scriptName} is missing ${missing.join(", ")}`);
  }
});
