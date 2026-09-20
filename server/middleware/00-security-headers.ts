/**
 * Nitro half of P1-18 — apply security headers on every response (documents,
 * API, `/__grok/manifest`, install page). Filename `00-` sorts before
 * `grok-pwa.ts` so this middleware is outer and still wraps early returns.
 */
import { withSecurityHeaders } from "../../scripts/security-headers.mjs";

interface SecurityHeadersEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

export default async function securityHeadersMiddleware(
  _event: SecurityHeadersEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  return withSecurityHeaders(result);
}
