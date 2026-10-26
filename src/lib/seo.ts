import { canonicalUrl, jsonLdText, pageJsonLd, publicPage } from "../../scripts/seo-site.mjs";

export {
  PUBLIC_PAGES,
  PRIVATE_PATHS,
  SITE_NAME,
  SITE_ORIGIN,
  jsonLdText,
  siteJsonLd,
} from "../../scripts/seo-site.mjs";

/**
 * Title, description, canonical and breadcrumb data for a public page
 * (scripts/seo-site.mjs).
 * Canonical lives only in child routes so each page has exactly one, and it
 * always uses SITE_ORIGIN, never the request host. Share tags (og:title,
 * og:url, twitter:*) are written from these by server/middleware/01-seo-share.ts —
 * do not add og:/twitter: metas here; the platform injector strips them.
 */
export function pageHead(path: string) {
  const page = publicPage(path);
  if (!page) throw new Error(`pageHead: ${path} is not in PUBLIC_PAGES (scripts/seo-site.mjs)`);
  const crumbs = pageJsonLd(page.path);
  return {
    meta: [{ title: page.title }, { name: "description", content: page.description }],
    links: [{ rel: "canonical", href: canonicalUrl(page.path) }],
    // Data, not code: the CSP does not apply to application/ld+json.
    scripts: crumbs ? [{ type: "application/ld+json", children: jsonLdText(crumbs) }] : [],
  };
}

/** Sign-in, account and owner pages: rendered for people, kept out of search. */
export function noindexHead() {
  return { meta: [{ name: "robots", content: "noindex" }] };
}
