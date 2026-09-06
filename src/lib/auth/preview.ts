/**
 * Shared LIVE-PREVIEW OAuth client metadata (server-only — NEVER import from the client).
 *
 * The sandbox serves each live preview on a dynamic `https://*.grok-sandbox.com`
 * URL, which can't be pre-registered per app. The broker exposes ONE shared
 * "preview" client that accepts any
 * `https://*.grok-sandbox.com/api/auth/oauth2/callback/*`.
 *
 * Client id is public. The client **secret must come from env only**:
 *   GROK_PREVIEW_CLIENT_SECRET  (preferred) or PREVIEW_CLIENT_SECRET
 * When deployed, GROK_AUTH_CLIENT_SECRET overrides preview credentials entirely
 * (see `server.ts`). Never commit a preview client secret.
 */
export const PREVIEW_CLIENT_ID = "grok_preview";

/** The shared auth broker issuer (OIDC discovery lives under it). */
export const GROK_ISSUER_DEFAULT = "https://auth.grok.me";

/**
 * Host patterns whose callbacks the preview client accepts. Better Auth derives
 * the live preview's real origin from the request host and validates it against
 * this list (wildcard-matched).
 */
export const PREVIEW_ALLOWED_HOSTS = ["*.grok-sandbox.com"] as const;

/**
 * Preview OAuth client secret from env only. Returns undefined when unset.
 * Does not fall back to any hardcoded value.
 */
export class PreviewOAuthSecret {
  static read(): string | undefined {
    const value =
      process.env.GROK_PREVIEW_CLIENT_SECRET?.trim() ||
      process.env.PREVIEW_CLIENT_SECRET?.trim();
    return value || undefined;
  }
}
