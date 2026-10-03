/**
 * Product version shown in the sky chrome ("Closed beta · V.01").
 *
 * Auto-bumps on each merge to main via `scripts/bump-site-version.mjs`
 * (GitHub Action). Stays below 1.0 forever unless you change SITE_VERSION
 * to `"1.0"` (or higher) yourself in this file.
 *
 * Keep the assignment on one line — the bump script rewrites it by regex.
 */
import { siteVersionChrome as formatChrome } from "./site-version-format";

export const SITE_VERSION = "0.65";
export {
  formatSiteVersionShort,
  isPreReleaseVersion,
  siteVersionChrome as formatSiteVersionChrome,
} from "./site-version-format";

/** Visible chrome + accessible label for the live badge. */
export function siteVersionChrome(version: string = SITE_VERSION) {
  return formatChrome(version);
}
