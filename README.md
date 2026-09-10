# TrustYourSign

The Vault — a natal fly-through.

Live: https://trustyoursigns.grok.me/

## Security env (required for auth)

Never commit secrets. Set in the host environment:

- `OWNER_PASSWORD` — owner desk email/password (**not** the legacy value `True`; treat that as compromised)
- `GROK_PREVIEW_CLIENT_SECRET` or `PREVIEW_CLIENT_SECRET` — live-preview OAuth client secret
- `GROK_AUTH_CLIENT_SECRET` — deployed per-app OAuth secret (overrides preview)

See `docs/security/p0-remediation-2026-09-06.md`.

## Cloudflare Turnstile (optional bot protection)

Joey’s existing Cloudflare Turnstile widget — do **not** create a new one.

Set in the host environment (Vercel Production + Preview). **Never commit secrets.**

- `VITE_TURNSTILE_SITE_KEY=0x4AAAAAAErVvyAn66cRPEas` (public site key; rebuild/redeploy after setting — Vite inlines at build)
- `TURNSTILE_SECRET_KEY` — server secret, set in Vercel only (never commit or paste in chat/repo)

Both vars are required together (Better Auth captcha plugin + login widget).

Allowed hostnames on the Cloudflare widget: `trustyoursigns.grok.me`, Vercel preview hosts, `localhost`.

See `docs/security/turnstile.md`.
