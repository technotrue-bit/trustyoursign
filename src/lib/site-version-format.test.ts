import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSiteVersionShort,
  isPreReleaseVersion,
  siteVersionChrome,
} from "./site-version-format.ts";

describe("site version chrome", () => {
  it("formats the short V.NN badge from 0.NN", () => {
    assert.equal(formatSiteVersionShort("0.01"), "01");
    assert.equal(formatSiteVersionShort("0.10"), "10");
    assert.equal(formatSiteVersionShort("0.99"), "99");
  });

  it("keeps closed-beta copy below 1.0", () => {
    assert.equal(isPreReleaseVersion("0.01"), true);
    assert.deepEqual(siteVersionChrome("0.01"), {
      text: "Closed beta · V.01",
      ariaLabel: "Closed beta version 0.01",
    });
  });

  it("drops closed-beta copy at 1.0 (manual only)", () => {
    assert.equal(isPreReleaseVersion("1.0"), false);
    assert.deepEqual(siteVersionChrome("1.0"), {
      text: "V.1.0",
      ariaLabel: "Version 1.0",
    });
  });
});
