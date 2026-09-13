import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extraTrustedOrigins, parseOriginList } from "./trusted-origins.ts";

/**
 * Sign-in from a deployment URL was impossible: `trustedOrigins` carried only
 * `BETTER_AUTH_URL` + localhost, so every credentialed POST from a
 * `*.vercel.app` host was rejected `INVALID_ORIGIN` before the credentials were
 * read — the browser reported a failed sign-in that no password could fix.
 */
describe("deployment origins are trusted", () => {
  it("trusts this project's production domain, deployment host and branch alias", () => {
    const origins = extraTrustedOrigins({
      VERCEL_PROJECT_PRODUCTION_URL: "trustyoursign.vercel.app",
      VERCEL_URL: "trustyoursign-abc123-true-team2.vercel.app",
      VERCEL_BRANCH_URL: "trustyoursign-git-main-true-team2.vercel.app",
    });
    // Full origins (matched against Origin) …
    assert.ok(origins.includes("https://trustyoursign.vercel.app"));
    assert.ok(origins.includes("https://trustyoursign-abc123-true-team2.vercel.app"));
    assert.ok(origins.includes("https://trustyoursign-git-main-true-team2.vercel.app"));
    // … and bare hosts (matched against Origin's host), mirroring preview hosts.
    assert.ok(origins.includes("trustyoursign.vercel.app"));
  });

  it("tolerates a scheme or trailing slash in the injected values", () => {
    const origins = extraTrustedOrigins({
      VERCEL_PROJECT_PRODUCTION_URL: "https://trustyoursign.vercel.app/",
    });
    assert.deepEqual(origins, ["trustyoursign.vercel.app", "https://trustyoursign.vercel.app"]);
  });

  it("returns nothing when not on Vercel (so local dev is unchanged)", () => {
    assert.deepEqual(extraTrustedOrigins({}), []);
    assert.deepEqual(extraTrustedOrigins({ VERCEL: "1", NODE_ENV: "production" }), []);
  });

  it("does NOT trust every vercel.app site", () => {
    const origins = extraTrustedOrigins({
      VERCEL_PROJECT_PRODUCTION_URL: "trustyoursign.vercel.app",
    });
    assert.equal(
      origins.some((o) => o.includes("*")),
      false,
      "a wildcard here would trust unrelated apps on the same platform",
    );
  });

  it("accepts AUTH_TRUSTED_ORIGINS extras in both forms", () => {
    const origins = extraTrustedOrigins({
      AUTH_TRUSTED_ORIGINS: "https://trustyoursigns.grok.me, https://vault.example.com",
    });
    assert.ok(origins.includes("https://trustyoursigns.grok.me"));
    assert.ok(origins.includes("trustyoursigns.grok.me"));
    assert.ok(origins.includes("https://vault.example.com"));
  });

  it("de-duplicates when a host is injected and listed explicitly", () => {
    const origins = extraTrustedOrigins({
      VERCEL_PROJECT_PRODUCTION_URL: "trustyoursign.vercel.app",
      AUTH_TRUSTED_ORIGINS: "https://trustyoursign.vercel.app",
    });
    assert.deepEqual(origins, ["trustyoursign.vercel.app", "https://trustyoursign.vercel.app"]);
  });
});

describe("origin list parsing", () => {
  it("splits on commas and whitespace and drops blanks", () => {
    assert.deepEqual(parseOriginList(" a.com ,  b.com\n"), ["a.com", "b.com"]);
    assert.deepEqual(parseOriginList(""), []);
    assert.deepEqual(parseOriginList(undefined), []);
    assert.deepEqual(parseOriginList("  ,  "), []);
  });

  it("strips trailing slashes so it matches an Origin header", () => {
    assert.deepEqual(parseOriginList("https://a.com/"), ["https://a.com"]);
  });
});
