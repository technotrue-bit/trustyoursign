/**
 * Search files stay in step with scripts/seo-site.mjs: robots.txt lets
 * crawlers in but keeps private paths out, the sitemap lists exactly the
 * public pages, and vercel.json sends duplicate hosts to the apex.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PRIVATE_PATHS, PUBLIC_PAGES, SITE_ORIGIN, canonicalUrl } from "./seo-site.mjs";
import { CONTENT_SECURITY_POLICY, STRICT_TRANSPORT_SECURITY } from "./security-headers.mjs";

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

function robotsRules() {
  return read("public/robots.txt")
    .split("\n")
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(":");
      return { key: line.slice(0, at).trim().toLowerCase(), value: line.slice(at + 1).trim() };
    });
}

function sitemapLocs() {
  return [...read("public/sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

describe("robots.txt", () => {
  const rules = robotsRules();
  const disallowed = rules.filter((r) => r.key === "disallow").map((r) => r.value);

  it("does not block the whole site", () => {
    assert.equal(disallowed.includes("/"), false);
    assert.ok(rules.some((r) => r.key === "user-agent" && r.value === "*"));
    assert.ok(rules.some((r) => r.key === "allow" && r.value === "/"));
  });

  it("points at the sitemap on the canonical origin", () => {
    const sitemaps = rules.filter((r) => r.key === "sitemap").map((r) => r.value);
    assert.deepEqual(sitemaps, [`${SITE_ORIGIN}/sitemap.xml`]);
  });

  it("disallows every private path", () => {
    for (const path of PRIVATE_PATHS) assert.ok(disallowed.includes(path), path);
  });

  it("does not disallow a public page", () => {
    for (const page of PUBLIC_PAGES) {
      if (page.path === "/") continue;
      for (const rule of disallowed) {
        assert.equal(page.path.startsWith(rule), false, `${rule} blocks ${page.path}`);
      }
    }
  });
});

describe("sitemap.xml", () => {
  const locs = sitemapLocs();

  it("lists exactly the public pages, in order", () => {
    assert.deepEqual(
      locs,
      PUBLIC_PAGES.map((page) => canonicalUrl(page.path)),
    );
  });

  it("lists no private path", () => {
    for (const loc of locs) {
      const path = new URL(loc).pathname;
      for (const priv of PRIVATE_PATHS) {
        assert.equal(path.startsWith(priv), false, `${loc} is private`);
      }
    }
  });
});

describe("public page copy", () => {
  it("has a unique title and description per page", () => {
    const titles = new Set(PUBLIC_PAGES.map((p) => p.title));
    const descriptions = new Set(PUBLIC_PAGES.map((p) => p.description));
    assert.equal(titles.size, PUBLIC_PAGES.length);
    assert.equal(descriptions.size, PUBLIC_PAGES.length);
  });

  it("keeps descriptions in the length search results show", () => {
    for (const page of PUBLIC_PAGES) {
      const n = page.description.length;
      assert.ok(n >= 110 && n <= 165, `${page.path}: ${n} chars`);
    }
  });
});

describe("vercel.json host rules", () => {
  const config = JSON.parse(read("vercel.json"));

  const redirectFor = (host) =>
    (config.redirects ?? []).find(
      (r) => r.has?.length === 1 && r.has[0].type === "host" && r.has[0].value === host,
    );

  for (const host of ["trustyoursign.vercel.app", "www.trustyoursign.com"]) {
    it(`sends ${host} to the apex permanently`, () => {
      const rule = redirectFor(host);
      assert.ok(rule, host);
      assert.equal(rule.source, "/:path*");
      assert.equal(rule.destination, `${SITE_ORIGIN}/:path*`);
      assert.equal(rule.permanent, true);
    });
  }

  it("noindexes every other vercel.app host", () => {
    const rule = config.headers.find((h) =>
      h.has?.some((c) => c.type === "host" && c.value === "(?<sub>.*)\\.vercel\\.app"),
    );
    assert.ok(rule);
    assert.equal(rule.source, "/(.*)");
    assert.deepEqual(rule.headers, [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]);
    const re = new RegExp(`^${rule.has[0].value}$`);
    assert.ok(re.test("trustyoursign-git-feat-seo-true-team2.vercel.app"));
    assert.equal(re.test("trustyoursign.com"), false);
  });

  it("leaves the site-wide security headers and asset cache unchanged", () => {
    const site = config.headers.find((h) => h.source === "/(.*)" && !h.has);
    const value = (key) => site.headers.find((h) => h.key === key)?.value;
    assert.equal(value("Content-Security-Policy"), CONTENT_SECURITY_POLICY);
    assert.equal(value("Strict-Transport-Security"), STRICT_TRANSPORT_SECURITY);
    assert.equal(value("X-Content-Type-Options"), "nosniff");
    const cache = config.headers.find((h) => h.source === "/(signs|sky|models)/(.*)");
    assert.deepEqual(cache.headers, [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ]);
  });
});
