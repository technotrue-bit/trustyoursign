import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

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
