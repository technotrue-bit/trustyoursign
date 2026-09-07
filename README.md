# TrustYourSign

The Vault — a natal fly-through.

Live: https://trustyoursigns.grok.me/

## Cloudflare Turnstile (optional bot protection)

Joey’s existing Cloudflare Turnstile widget — do **not** create a new one.

Set in the host environment (Vercel Production + Preview). **Never commit secrets.**

- `VITE_TURNSTILE_SITE_KEY=0x4AAAAAAErVvyAn66cRPEas` (public site key; rebuild/redeploy after setting — Vite inlines at build)
- `TURNSTILE_SECRET_KEY` — server secret, set in Vercel only (never commit or paste in chat/repo)

Both vars are required together (Better Auth captcha plugin + login widget).

Allowed hostnames on the Cloudflare widget: `trustyoursigns.grok.me`, Vercel preview hosts, `localhost`.

See `docs/security/turnstile.md`.
