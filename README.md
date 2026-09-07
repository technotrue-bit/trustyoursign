# TrustYourSign

The Vault — a natal fly-through.

Live: https://trustyoursigns.grok.me/

## Security env (required for auth)

Never commit secrets. Set in the host environment:

- `OWNER_PASSWORD` — owner desk email/password (**not** the legacy value `True`; treat that as compromised)
- `GROK_PREVIEW_CLIENT_SECRET` or `PREVIEW_CLIENT_SECRET` — live-preview OAuth client secret
- `GROK_AUTH_CLIENT_SECRET` — deployed per-app OAuth secret (overrides preview)
- Optional bot protection (Joey’s existing Cloudflare Turnstile widget — do not create a new one):
  - `VITE_TURNSTILE_SITE_KEY=0x4AAAAAAErVvyAn66cRPEas` on Vercel Production + Preview (public site key; rebuild after setting)
  - `TURNSTILE_SECRET_KEY` — server secret, set in Vercel only (never commit or paste in chat)
  - Hostnames on the widget: `trustyoursigns.grok.me`, Vercel preview, `localhost`

See `docs/security/p0-remediation-2026-09-06.md`.

