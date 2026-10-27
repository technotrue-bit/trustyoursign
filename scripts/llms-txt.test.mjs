/**
 * public/llms.txt (the plain-text guide AI assistants read, llmstxt.org) and
 * the AI crawler names in public/robots.txt stay in step with
 * scripts/seo-site.mjs and the sign canon: every public page is linked, no
 * private path is, and the twelve signs carry the canon's names and dates in
 * Aries-first order.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PRIVATE_PATHS, PUBLIC_PAGES, SITE_NAME, SITE_ORIGIN, canonicalUrl } from "./seo-site.mjs";

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

/** The canon's signs, Aries first, read from source so this test needs no TS loader. */
function canonSigns() {
  const src = read("src/lib/chart/sign-canon.ts");
  return [...src.matchAll(/id: "(\w+)",\s*name: "([^"]+)",[\s\S]*?dates: "([^"]+)"/g)].map(
    ([, id, name, dates]) => ({ id, name, dates }),
  );
}

describe("llms.txt", () => {
  const txt = read("public/llms.txt");
  const links = [...txt.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((m) => m[1]);

  it("opens with the site name and a one-line summary", () => {
    assert.match(txt, new RegExp(`^# ${SITE_NAME}\\n\\n> .+\\n`));
  });

  it("links every public page", () => {
    for (const page of PUBLIC_PAGES) {
      assert.ok(links.includes(canonicalUrl(page.path)), page.path);
    }
  });

  it("links only the canonical origin or known outside pages, and no private path", () => {
    for (const link of links) {
      const url = new URL(link);
      if (url.origin !== SITE_ORIGIN) {
        assert.ok(["https://x.com"].includes(url.origin), link);
        continue;
      }
      for (const priv of PRIVATE_PATHS) {
        assert.equal(url.pathname.startsWith(priv), false, `${link} is private`);
      }
    }
  });

  it("lists each sign's daily reading with the canon's name and dates, Aries first", () => {
    const signs = canonSigns();
    assert.equal(signs.length, 12);
    const lines = [...txt.matchAll(/^- \[(\w+) today\]\(([^)]+)\): (.+)$/gm)];
    assert.deepEqual(
      lines.map(([, name, url]) => [name, url]),
      signs.map((s) => [s.name, `${SITE_ORIGIN}/today?sign=${s.id}`]),
    );
    lines.forEach(([, , , note], i) => assert.ok(note.startsWith(`${signs[i].dates}.`), note));
  });
});

describe("robots.txt for AI crawlers", () => {
  const robots = read("public/robots.txt");

  it("names the main AI crawlers in the same group as *", () => {
    const group = robots.split(/\n\s*\n/).find((block) => /^User-agent: \*$/m.test(block));
    assert.ok(group);
    for (const bot of [
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "Claude-SearchBot",
      "Claude-User",
      "PerplexityBot",
      "Google-Extended",
    ]) {
      assert.match(group, new RegExp(`^User-agent: ${bot}$`, "m"), bot);
    }
    assert.equal((robots.match(/^User-agent: \*$/gm) ?? []).length, 1);
  });
});
