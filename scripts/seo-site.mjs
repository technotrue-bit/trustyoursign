/**
 * Search-engine facts in one place: the canonical origin, the public pages
 * (titles, descriptions, sitemap), and the private paths robots.txt keeps out.
 * Plain ESM so `node --test`, the Nitro middleware and `src/lib/seo.ts` all
 * read the same list. public/robots.txt, public/sitemap.xml and public/llms.txt
 * (the guide for AI assistants) are static; scripts/seo-files.test.mjs and
 * scripts/llms-txt.test.mjs fail when they drift from this file.
 */

/** Canonical URLs always use this origin, never the request host. */
export const SITE_ORIGIN = "https://trustyoursign.com";
export const SITE_NAME = "Trust Your Sign";
/** Share card for hosts where the platform injector leaves og:image out (vercel.app). */
export const SITE_OG_IMAGE = `${SITE_ORIGIN}/og.jpg`;
export const SITE_AUTHOR = { name: "Devin Norris", sameAs: ["https://x.com/ItsMeTrueG"] };

/** Indexable pages, in sitemap order. */
export const PUBLIC_PAGES = [
  {
    path: "/",
    title: "Trust Your Sign: a natal fly-through astrology chart",
    description:
      "Pick your zodiac sign, fly through its sky, and unlock a natal chart: your sun, moon, and rising sign, computed from real astronomy.",
    changefreq: "weekly",
    priority: "1.0",
  },
  {
    path: "/today",
    title: "Today's sky for your sign · Trust Your Sign",
    description:
      "A daily astrology reading for each zodiac sign from the real sky: the Moon's phase and sign today, how it lands on yours, and what to lean into.",
    changefreq: "daily",
    priority: "0.8",
  },
  {
    path: "/about",
    title: "About · Trust Your Sign",
    description:
      "What Trust Your Sign is, who built it, and what is still rough: a small, independent natal fly-through astrology project by Devin Norris.",
    changefreq: "monthly",
    priority: "0.6",
  },
  {
    path: "/how-this-works",
    title: "How this works · Trust Your Sign",
    description:
      "How a Trust Your Sign chart is computed: the tropical zodiac, positions from a real ephemeris library, and your Big Three of sun, moon, and rising.",
    changefreq: "monthly",
    priority: "0.6",
  },
  {
    path: "/faq",
    title: "FAQ · Trust Your Sign",
    description:
      "Short answers about Trust Your Sign: entertainment or advice, what happens to your data, deleting it, the closed beta, and why time and place matter.",
    changefreq: "monthly",
    priority: "0.6",
  },
  {
    path: "/contact",
    title: "Contact · Trust Your Sign",
    description:
      "How to reach Trust Your Sign: privacy and data requests go to privacy@trustyoursign.com, and product bugs and beta feedback have their own inbox.",
    changefreq: "monthly",
    priority: "0.5",
  },
  {
    path: "/privacy",
    title: "Privacy Policy · Trust Your Sign",
    description:
      "What Trust Your Sign collects, why, and for how long. We do not sell personal data, use advertising cookies, or train public models on your charts.",
    changefreq: "yearly",
    priority: "0.3",
  },
  {
    path: "/terms",
    title: "Terms of Use · Trust Your Sign",
    description:
      "The terms for using Trust Your Sign, a natal fly-through astrology site owned by Devin Norris. It is entertainment, not medical, legal, or financial advice.",
    changefreq: "yearly",
    priority: "0.3",
  },
];

/**
 * Sign-in, account, owner and API paths. robots.txt disallows each one and
 * the routes that render a page also send `<meta name="robots" content="noindex">`.
 */
export const PRIVATE_PATHS = [
  "/login",
  "/signup",
  "/register",
  "/reset-password",
  "/account",
  "/sky-code",
  "/admin",
  "/maintenance",
  "/api/",
  "/__grok/",
];

/** Absolute canonical URL for a site path. */
export function canonicalUrl(path) {
  const clean = String(path ?? "/").split(/[?#]/, 1)[0] || "/";
  return `${SITE_ORIGIN}${clean.startsWith("/") ? clean : `/${clean}`}`;
}

/** The PUBLIC_PAGES entry for a path, or undefined. */
export function publicPage(path) {
  return PUBLIC_PAGES.find((page) => page.path === path);
}

const AUTHOR_ID = `${SITE_ORIGIN}/#author`;

/**
 * Site-wide schema.org data for the root head: one graph whose nodes point at
 * each other by @id, so search engines read the site, the app and its author
 * as one entity rather than three loose ones.
 */
export function siteJsonLd() {
  const url = canonicalUrl("/");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: SITE_NAME,
        url,
        inLanguage: "en",
        publisher: { "@id": AUTHOR_ID },
      },
      {
        "@type": "Person",
        "@id": AUTHOR_ID,
        name: SITE_AUTHOR.name,
        sameAs: SITE_AUTHOR.sameAs,
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_ORIGIN}/#app`,
        name: SITE_NAME,
        url,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        description: publicPage("/")?.description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@id": AUTHOR_ID },
      },
    ],
  };
}

/** Short page name for breadcrumbs: the title before " · ". */
export function pageName(page) {
  return page.title.split(" · ", 1)[0];
}

/** Home → page breadcrumb for a public page below the home page; undefined otherwise. */
export function pageJsonLd(path) {
  const page = publicPage(path);
  if (!page || page.path === "/") return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: canonicalUrl("/") },
      { "@type": "ListItem", position: 2, name: pageName(page), item: canonicalUrl(page.path) },
    ],
  };
}

/** JSON for an application/ld+json script, `<` escaped so it can never close its own tag. */
export function jsonLdText(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
