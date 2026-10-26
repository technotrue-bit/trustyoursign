/**
 * schema.org data stays in step with scripts/seo-site.mjs: one linked graph
 * for the site, and a Home → page breadcrumb for every public page below it.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PUBLIC_PAGES,
  SITE_AUTHOR,
  SITE_NAME,
  SITE_ORIGIN,
  canonicalUrl,
  jsonLdText,
  pageJsonLd,
  publicPage,
  siteJsonLd,
} from "./seo-site.mjs";

describe("siteJsonLd", () => {
  const data = siteJsonLd();
  const byType = (type) => data["@graph"].find((node) => node["@type"] === type);

  it("is one schema.org graph of the site, its author and the app", () => {
    assert.equal(data["@context"], "https://schema.org");
    assert.deepEqual(
      data["@graph"].map((node) => node["@type"]),
      ["WebSite", "Person", "WebApplication"],
    );
  });

  it("gives every node a unique id on the canonical origin", () => {
    const ids = data["@graph"].map((node) => node["@id"]);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.ok(id.startsWith(`${SITE_ORIGIN}/#`), id);
  });

  it("points the site and the app at the author by id", () => {
    const person = byType("Person");
    assert.equal(person.name, SITE_AUTHOR.name);
    assert.deepEqual(person.sameAs, SITE_AUTHOR.sameAs);
    assert.deepEqual(byType("WebSite").publisher, { "@id": person["@id"] });
    assert.deepEqual(byType("WebApplication").author, { "@id": person["@id"] });
  });

  it("uses the home page's canonical URL and description", () => {
    for (const type of ["WebSite", "WebApplication"]) {
      assert.equal(byType(type).name, SITE_NAME);
      assert.equal(byType(type).url, canonicalUrl("/"));
    }
    assert.equal(byType("WebApplication").description, publicPage("/").description);
  });
});

describe("pageJsonLd", () => {
  it("has no breadcrumb for the home page or an unknown path", () => {
    assert.equal(pageJsonLd("/"), undefined);
    assert.equal(pageJsonLd("/login"), undefined);
  });

  it("gives every other public page a Home → page breadcrumb", () => {
    for (const page of PUBLIC_PAGES) {
      if (page.path === "/") continue;
      const crumbs = pageJsonLd(page.path);
      assert.equal(crumbs["@type"], "BreadcrumbList");
      const items = crumbs.itemListElement;
      assert.deepEqual(
        items.map((item) => [item.position, item.item]),
        [
          [1, canonicalUrl("/")],
          [2, canonicalUrl(page.path)],
        ],
      );
      assert.equal(items[0].name, SITE_NAME);
      assert.ok(items[1].name && !items[1].name.includes("·"), page.path);
      assert.ok(page.title.startsWith(items[1].name), page.path);
    }
  });
});

describe("jsonLdText", () => {
  it("escapes < so the JSON can never close its own script tag", () => {
    const text = jsonLdText({ name: "</script><script>alert(1)</script>" });
    assert.equal(text.includes("<"), false);
    assert.deepEqual(JSON.parse(text), { name: "</script><script>alert(1)</script>" });
  });
});
