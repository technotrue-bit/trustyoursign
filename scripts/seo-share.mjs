/**
 * Per-page share tags. The platform injector (grok-pwa-shared.mjs) strips
 * every og:/twitter: meta and writes one site-wide set, so per-page values
 * cannot come from route head(). server/middleware/01-seo-share.ts runs
 * outside that injector and rewrites its output from the page's own head:
 *
 *   og:title / twitter:title             ← <title>
 *   og:description / twitter:description ← <meta name="description">
 *   og:url                               ← <link rel="canonical">
 *   og:site_name                         ← SITE_NAME
 *   twitter:image                        ← og:image (SITE_OG_IMAGE when the
 *                                          injector left it out, e.g. vercel.app)
 *
 * og:type and x:game:* are left as the injector wrote them.
 */
import { escapeHtml } from "./grok-pwa-shared.mjs";
import { SITE_NAME, SITE_OG_IMAGE } from "./seo-site.mjs";

const REWRITTEN_KEYS = new Set([
  "og:title",
  "og:description",
  "og:url",
  "og:site_name",
  "twitter:title",
  "twitter:description",
  "twitter:image",
]);

function unescapeHtml(value) {
  return String(value)
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
}

/** Attribute map of one tag, lowercase names, raw (still escaped) values. */
function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? "";
  }
  return out;
}

function metaKey(a) {
  return String(a.property ?? a.name ?? "").toLowerCase();
}

/** Values the share tags are built from, read from an HTML head. */
export function readShareSource(html) {
  const source = { title: "", description: "", canonical: "", ogImage: "", hasImageSize: false };
  const title = String(html).match(/<title\b[^>]*>([^<]*)<\/title>/i);
  if (title) source.title = unescapeHtml(title[1]).trim();
  for (const [tag] of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(tag);
    const key = metaKey(a);
    if (key === "description" && !source.description) {
      source.description = unescapeHtml(a.content ?? "").trim();
    } else if (key === "og:image" && !source.ogImage) {
      source.ogImage = unescapeHtml(a.content ?? "").trim();
    } else if (key === "og:image:width") {
      source.hasImageSize = true;
    }
  }
  for (const [tag] of String(html).matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(tag);
    if (String(a.rel ?? "").toLowerCase() === "canonical" && !source.canonical) {
      source.canonical = unescapeHtml(a.href ?? "").trim();
    }
  }
  return source;
}

const meta = (attr, key, content) =>
  `<meta ${attr}="${key}" content="${escapeHtml(content)}">`;

/** Rewrite the share tags in an HTML head (or a whole document). */
export function rewriteShareHead(html) {
  if (typeof html !== "string" || !/<\/head>/i.test(html)) return html;
  const src = readShareSource(html);
  const tags = [];
  const replace = new Set();
  const set = (attr, key, content) => {
    if (!content) return;
    replace.add(key);
    tags.push(meta(attr, key, content));
  };

  set("property", "og:title", src.title);
  set("property", "og:description", src.description);
  set("property", "og:url", src.canonical);
  set("property", "og:site_name", SITE_NAME);
  set("name", "twitter:title", src.title);
  set("name", "twitter:description", src.description);
  const image = src.ogImage || SITE_OG_IMAGE;
  if (!src.ogImage) {
    tags.push(meta("property", "og:image", image));
    if (!src.hasImageSize) {
      tags.push(meta("property", "og:image:width", "1200"));
      tags.push(meta("property", "og:image:height", "630"));
    }
  }
  set("name", "twitter:image", image);

  const stripped = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    const key = metaKey(attrs(tag));
    return REWRITTEN_KEYS.has(key) && replace.has(key) ? "" : tag;
  });
  return stripped.replace(/<\/head>/i, `${tags.join("")}</head>`);
}

/**
 * Streaming rewriter: buffers only until `</head>`, rewrites that part, then
 * passes later chunks straight through so SSR keeps streaming. A document
 * with no `</head>` is flushed unchanged.
 */
export function createShareRewriter() {
  /** @type {Buffer[]} */
  let pending = [];
  let done = false;
  return {
    /** @param {Uint8Array | string} chunk @returns {Buffer[]} */
    push(chunk) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (done) return [buf];
      pending.push(buf);
      const joined = Buffer.concat(pending);
      const at = joined.toString("latin1").search(/<\/head>/i);
      if (at === -1) return [];
      done = true;
      pending = [];
      const end = at + "</head>".length;
      const head = rewriteShareHead(joined.subarray(0, end).toString("utf8"));
      return [Buffer.concat([Buffer.from(head, "utf8"), joined.subarray(end)])];
    },
    /** @returns {Buffer[]} */
    flush() {
      if (done || pending.length === 0) return [];
      done = true;
      const rest = Buffer.concat(pending);
      pending = [];
      return [rest];
    },
  };
}
