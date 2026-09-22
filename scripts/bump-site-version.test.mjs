import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  AUTO_BUMP_CAP,
  nextSiteVersion,
  parseSiteVersion,
  readSiteVersionSource,
  writeSiteVersion,
  writeSiteVersionStub,
} from "./bump-site-version.mjs";

describe("site version bump", () => {
  it("parses pre-1.0 hundredths", () => {
    assert.deepEqual(parseSiteVersion("0.01"), { ok: true, value: 0.01 });
    assert.deepEqual(parseSiteVersion("0.99"), { ok: true, value: 0.99 });
  });

  it("bumps by one hundredth", () => {
    assert.deepEqual(nextSiteVersion("0.01"), { bumped: true, version: "0.02" });
    assert.deepEqual(nextSiteVersion("0.09"), { bumped: true, version: "0.10" });
    assert.deepEqual(nextSiteVersion("0.98"), { bumped: true, version: "0.99" });
  });

  it("never auto-bumps onto or past 1.0", () => {
    const atCap = nextSiteVersion(AUTO_BUMP_CAP.toFixed(2));
    assert.equal(atCap.bumped, false);
    assert.equal(atCap.version, "0.99");

    assert.equal(nextSiteVersion("1.0").bumped, false);
    assert.equal(nextSiteVersion("1.2").bumped, false);
  });

  it("round-trips a SITE_VERSION rewrite under the cap", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "site-ver-"));
    const file = path.join(dir, "site-version.ts");
    writeSiteVersionStub("0.01", file);
    assert.equal(readSiteVersionSource(file).version, "0.01");
    const next = nextSiteVersion("0.01");
    writeSiteVersion(next.version, file);
    assert.equal(readSiteVersionSource(file).version, "0.02");
  });
});
