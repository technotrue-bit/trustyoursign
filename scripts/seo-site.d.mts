export type PublicPage = {
  path: string;
  title: string;
  description: string;
  changefreq: string;
  priority: string;
};

export declare const SITE_ORIGIN: string;
export declare const SITE_NAME: string;
export declare const SITE_OG_IMAGE: string;
export declare const SITE_AUTHOR: { name: string; sameAs: string[] };
export declare const PUBLIC_PAGES: readonly PublicPage[];
export declare const PRIVATE_PATHS: readonly string[];
export declare function canonicalUrl(path: string): string;
export declare function publicPage(path: string): PublicPage | undefined;
