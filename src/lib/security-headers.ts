/**
 * Security response headers (P1-18) — re-export of the shared script module
 * used by Vite, Nitro, and `vercel.json` parity tests.
 */
export {
  CONTENT_SECURITY_POLICY,
  PERMISSIONS_POLICY,
  REFERRER_POLICY,
  SECURITY_HEADER_NAMES,
  SECURITY_HEADERS,
  STRICT_TRANSPORT_SECURITY,
  applySecurityHeaders,
  withSecurityHeaders,
} from "../../scripts/security-headers.mjs";
