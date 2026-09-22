/**
 * Pure formatters for the product version badge.
 * Version source of truth: `site-version.json` (see `site-version.ts`).
 */

/** Strip the leading `0.` for the short badge: `"0.01"` → `"01"`. */
export function formatSiteVersionShort(version: string): string {
  if (/^0\.\d{2}$/.test(version)) return version.slice(2);
  return version;
}

export function isPreReleaseVersion(version: string): boolean {
  const n = Number(version);
  return Number.isFinite(n) && n >= 0 && n < 1;
}

/** Visible chrome + accessible label for the corner badge. */
export function siteVersionChrome(version: string): {
  text: string;
  ariaLabel: string;
} {
  if (isPreReleaseVersion(version)) {
    const short = formatSiteVersionShort(version);
    return {
      text: `Closed beta · V.${short}`,
      ariaLabel: `Closed beta version ${version}`,
    };
  }
  return {
    text: `V.${version}`,
    ariaLabel: `Version ${version}`,
  };
}
