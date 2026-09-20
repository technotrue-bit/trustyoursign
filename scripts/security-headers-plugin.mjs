/**
 * Vite half of P1-18 — set security headers on local `npm run dev` and
 * `vite preview` responses so document probes show the same policy as Vercel.
 */
import { SECURITY_HEADERS } from "./security-headers.mjs";

function attachSecurityHeaders(middlewares) {
  middlewares.use((_req, res, next) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      // Always set — matches Nitro/vercel overwrite so local probes are stable.
      res.setHeader(name, value);
    }
    next();
  });
}

export function securityHeadersPlugin() {
  return {
    name: "app-builder:security-headers",
    configureServer(server) {
      attachSecurityHeaders(server.middlewares);
    },
    configurePreviewServer(server) {
      attachSecurityHeaders(server.middlewares);
    },
  };
}
