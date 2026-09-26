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

/** Loopback hosts, exactly as a `host` header can spell them. */
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1"] as const;

/**
 * True when a request's host belongs to a live preview (sandbox) or loopback —
 * the only hosts where the owner preview desk may bind a session. Accepts a raw
 * `host` header value (a `:port` suffix is ignored) and wildcard-matches
 * `PREVIEW_ALLOWED_HOSTS`.
 *
 * This exists so that decision never rests on "a platform env var happened to be
 * absent": `previewDeskOpen` requires it AND `ALLOW_PREVIEW_OWNER_BIND=1`,
 * which keeps a stray self-host from handing an owner session to whoever loads
 * the page. Unset flag fails closed.
 */
/**
 * Positive opt-in for the owner preview desk. Anything other than `1`
 * (unset, empty, `true`, `yes`, `0`) fails closed.
 */
export function previewOwnerBindFlagOn(value: string | null | undefined): boolean {
  return value?.trim() === "1";
}

export type PreviewOwnerBindInput = {
  /** `VERCEL` — set on every Vercel deployment, including Preview. */
  vercel?: string | null;
  grokAuthClientSecret?: string | null;
  databaseUrl?: string | null;
  /** `ALLOW_PREVIEW_OWNER_BIND`. Must be exactly `1`. */
  allowFlag?: string | null;
  /** `x-forwarded-host` or `host`, already reduced to one value. */
  host?: string | null;
};

/**
 * Owner preview bind is allowed only when every gate passes:
 * not Vercel, not a configured deployed auth+database pair, the explicit
 * `ALLOW_PREVIEW_OWNER_BIND=1` flag, and a preview/loopback host.
 * Missing the flag fails closed even on localhost.
 */
export function canBindPreviewOwner(input: PreviewOwnerBindInput): boolean {
  if (input.vercel) return false;
  if (input.grokAuthClientSecret?.trim() && input.databaseUrl?.trim()) return false;
  if (!previewOwnerBindFlagOn(input.allowFlag)) return false;
  return isPreviewHost(input.host);
}

export function isPreviewHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const raw = host.trim().toLowerCase();
  if ((LOOPBACK_HOSTS as readonly string[]).includes(raw)) return true;
  const bare = raw.replace(/:\d{1,5}$/, "");
  if ((LOOPBACK_HOSTS as readonly string[]).includes(bare)) return true;
  return PREVIEW_ALLOWED_HOSTS.some((pattern) =>
    pattern.startsWith("*.") ? bare.endsWith(pattern.slice(1)) : bare === pattern,
  );
}

/**
 * Preview OAuth client secret from env only. Returns undefined when unset.
 * Does not fall back to any hardcoded value.
 */
export class PreviewOAuthSecret {
  static read(): string | undefined {
    const value =
      process.env.GROK_PREVIEW_CLIENT_SECRET?.trim() || process.env.PREVIEW_CLIENT_SECRET?.trim();
    return value || undefined;
  }
}
