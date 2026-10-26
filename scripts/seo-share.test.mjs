import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { injectGrokPwaHead } from "./grok-pwa-shared.mjs";
import { createShareRewriter, readShareSource, rewriteShareHead } from "./seo-share.mjs";

const SITE = {
  title: "Trust Your Sign",
  description: "A natal fly-through. Pick a sign, fly its sky, unlock a chart.",
  type: "x:game",
  card: "custom",
  image: "/og.jpg",
  banner: "/x-banner.jpg",
};

const page = (head) =>
  `<!DOCTYPE html><html lang="en"><head>${head}</head><body><main>hi</main></body></html>`;

const ABOUT_HEAD =
  '<meta charSet="utf-8"/><title>About · Trust Your Sign</title>' +
  '<meta name="description" content="Who built it &amp; why."/>' +
  '<link rel="canonical" href="https://trustyoursign.com/about"/>';

/** The document as it leaves grok-pwa.ts on a given host. */
const injected = (host, head = ABOUT_HEAD) =>
  injectGrokPwaHead(page(head), { host, site: SITE, cwd: "/nonexistent" });

function metas(html) {
  const out = {};
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = tag.match(/(?:property|name)="([^"]+)"/)?.[1];
    const content = tag.match(/content="([^"]*)"/)?.[1];
    if (!key) continue;
    (out[key] ??= []).push(content);
  }
  return out;
}

describe("seo share rewrite", () => {
  it("reads title, description and canonical from the head", () => {
    assert.deepEqual(readShareSource(page(ABOUT_HEAD)), {
      title: "About · Trust Your Sign",
      description: "Who built it & why.",
      canonical: "https://trustyoursign.com/about",
      ogImage: "",
      hasImageSize: false,
    });
  });

  it("writes per-page share tags over the injector's site-wide set", () => {
    const m = metas(rewriteShareHead(injected("trustyoursign.com")));
    assert.deepEqual(m["og:title"], ["About · Trust Your Sign"]);
    assert.deepEqual(m["og:description"], ["Who built it &amp; why."]);
    assert.deepEqual(m["og:url"], ["https://trustyoursign.com/about"]);
    assert.deepEqual(m["og:site_name"], ["Trust Your Sign"]);
    assert.deepEqual(m["twitter:title"], ["About · Trust Your Sign"]);
    assert.deepEqual(m["twitter:description"], ["Who built it &amp; why."]);
    assert.deepEqual(m["og:image"], ["https://trustyoursign.com/og.jpg"]);
    assert.deepEqual(m["twitter:image"], ["https://trustyoursign.com/og.jpg"]);
    assert.deepEqual(m["twitter:card"], ["summary_large_image"]);
  });

  it("replaces the injector's x:game type with website and drops the game banner", () => {
    const before = metas(injected("trustyoursign.com"));
    assert.deepEqual(before["og:type"], ["x:game"]);
    assert.ok(before["x:game:image"]);
    const after = metas(rewriteShareHead(injected("trustyoursign.com")));
    assert.deepEqual(after["og:type"], ["website"]);
    assert.equal(after["x:game:image"], undefined);
    assert.equal(after["x:game:image:width"], undefined);
    assert.equal(after["x:game:image:height"], undefined);
    assert.deepEqual(after["og:image:width"], ["1200"]);
  });

  it("writes og:type website when the injector wrote none", () => {
    const raw = injectGrokPwaHead(page(ABOUT_HEAD), {
      host: "trustyoursign.com",
      site: { ...SITE, type: undefined },
      cwd: "/nonexistent",
    });
    assert.equal(metas(raw)["og:type"], undefined);
    assert.deepEqual(metas(rewriteShareHead(raw))["og:type"], ["website"]);
  });

  it("adds the apex share card when the injector left og:image out (vercel.app)", () => {
    const raw = injected("trustyoursign.vercel.app");
    assert.equal(metas(raw)["og:image"], undefined);
    const m = metas(rewriteShareHead(raw));
    assert.deepEqual(m["og:image"], ["https://trustyoursign.com/og.jpg"]);
    assert.deepEqual(m["og:image:width"], ["1200"]);
    assert.deepEqual(m["og:image:height"], ["630"]);
    assert.deepEqual(m["twitter:image"], ["https://trustyoursign.com/og.jpg"]);
  });

  it("writes no og:url for a page without a canonical", () => {
    const head = '<title>Trust Your Sign</title><meta name="robots" content="noindex"/>';
    const m = metas(rewriteShareHead(injected("trustyoursign.com", head)));
    assert.equal(m["og:url"], undefined);
    assert.deepEqual(m["og:title"], ["Trust Your Sign"]);
    assert.deepEqual(m["og:description"], [SITE.description]);
  });

  it("leaves a fragment with no </head> alone", () => {
    assert.equal(rewriteShareHead("<p>hi</p>"), "<p>hi</p>");
  });

  it("streams: buffers to </head>, then passes the body through", () => {
    const doc = injected("trustyoursign.com");
    const cut = doc.indexOf("</he") + 2;
    const r = createShareRewriter();
    const out = [
      ...r.push(Buffer.from(doc.slice(0, cut))),
      ...r.push(Buffer.from(doc.slice(cut))),
      ...r.push(Buffer.from("<!-- tail -->")),
      ...r.flush(),
    ];
    const html = Buffer.concat(out).toString("utf8");
    assert.equal(html, rewriteShareHead(doc) + "<!-- tail -->");
  });

  it("flushes a document without </head> unchanged", () => {
    const r = createShareRewriter();
    const out = [...r.push("<html><body>x"), ...r.flush()];
    assert.equal(Buffer.concat(out).toString("utf8"), "<html><body>x");
  });
});
