/**
 * Platform-safe security headers (P1-18).
 *
 * Shared by Vite (local/preview), Nitro (`server/middleware/00-security-headers.ts`),
 * and mirrored in `vercel.json` for the edge. Keep those three in sync — see
 * `scripts/security-headers.test.mjs`.
 *
 * CSP notes:
 * - `style-src 'unsafe-inline'`: required for the FOUC blocker in `__root.tsx`
 *   (`dangerouslySetInnerHTML` style) and React `style={{…}}` attributes.
 * - `script-src` stays without `'unsafe-inline'`: Grok PWA injector, Turnstile,
 *   and app bundles are external/`'self'` module scripts.
 * - `frame-ancestors` (not `X-Frame-Options`): allow Grok / sandbox preview
 *   embeds while blocking arbitrary clickjacking.
 */

/** @type {string} */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // App modules + Grok branding injector + Turnstile + Vercel live toolbar.
  "script-src 'self' https://grok.com https://challenges.cloudflare.com https://vercel.live",
  // FOUC inline style + React style props + Google Fonts CSS.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Same-origin assets, data/blob URLs, OG/card images (og.grok.me + https).
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://challenges.cloudflare.com https://vercel.live wss://vercel.live https://*.vercel.live wss://*.vercel.live https://og.grok.me",
  "frame-src https://challenges.cloudflare.com https://vercel.live",
  "frame-ancestors 'self' https://grok.com https://*.grok.com https://*.grok-sandbox.com https://vercel.live",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

/** Match Vercel’s common production HSTS (see 2026-09-14 pre-beta review). */
export const STRICT_TRANSPORT_SECURITY =
  "max-age=63072000; includeSubDomains; preload";

export const REFERRER_POLICY = "strict-origin-when-cross-origin";

/** Lock down powerful APIs the app does not need. */
export const PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()";

/** @type {Readonly<Record<string, string>>} */
export const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Strict-Transport-Security": STRICT_TRANSPORT_SECURITY,
  "Referrer-Policy": REFERRER_POLICY,
  "Permissions-Policy": PERMISSIONS_POLICY,
  "X-Content-Type-Options": "nosniff",
});

/** Header names Security / Ultron should re-score on a document response. */
export const SECURITY_HEADER_NAMES = Object.freeze(Object.keys(SECURITY_HEADERS));

/**
 * Apply security headers onto a mutable header bag (Fetch Headers, or a
 * Node ServerResponse via setHeader). Skips overwrite when `overwrite` is false
 * and the header is already present.
 *
 * @param {{ set(name: string, value: string): void; get?(name: string): string | null | undefined }} headers
 * @param {{ overwrite?: boolean }} [opts]
 */
export function applySecurityHeaders(headers, opts = {}) {
  const overwrite = opts.overwrite !== false;
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!overwrite && typeof headers.get === "function" && headers.get(name)) continue;
    headers.set(name, value);
  }
}

/**
 * Return a new Response with security headers applied (preserves body stream).
 * @param {unknown} result
 * @returns {unknown}
 */
export function withSecurityHeaders(result) {
  if (!(result instanceof Response)) return result;
  const headers = new Headers(result.headers);
  applySecurityHeaders(headers, { overwrite: true });
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
