import {
  SITE_AUTHOR,
  SITE_NAME,
  SITE_ORIGIN,
  canonicalUrl,
  publicPage,
} from "../../scripts/seo-site.mjs";

export { PUBLIC_PAGES, PRIVATE_PATHS, SITE_NAME, SITE_ORIGIN } from "../../scripts/seo-site.mjs";

/**
 * Title, description and canonical for a public page (scripts/seo-site.mjs).
 * Canonical lives only in child routes so each page has exactly one, and it
 * always uses SITE_ORIGIN, never the request host. Share tags (og:title,
 * og:url, twitter:*) are written from these by server/middleware/01-seo-share.ts —
 * do not add og:/twitter: metas here; the platform injector strips them.
 */
export function pageHead(path: string) {
  const page = publicPage(path);
  if (!page) throw new Error(`pageHead: ${path} is not in PUBLIC_PAGES (scripts/seo-site.mjs)`);
  return {
    meta: [{ title: page.title }, { name: "description", content: page.description }],
    links: [{ rel: "canonical", href: canonicalUrl(page.path) }],
  };
}

/** Sign-in, account and owner pages: rendered for people, kept out of search. */
export function noindexHead() {
  return { meta: [{ name: "robots", content: "noindex" }] };
}

/** WebSite + WebApplication structured data for the root head. */
export function siteJsonLd() {
  const url = `${SITE_ORIGIN}/`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      url,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      description: "A natal fly-through. Pick a sign, fly its sky, unlock a chart.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Person", name: SITE_AUTHOR.name, sameAs: SITE_AUTHOR.sameAs },
    },
  ];
}
