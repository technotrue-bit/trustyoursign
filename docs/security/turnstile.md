# Cloudflare Turnstile (login)

Wires **Joey’s existing** Cloudflare Turnstile widget on `/login`. Do not create a new Cloudflare widget.

## Behavior

- Client: `TurnstileWidget` loads when `VITE_TURNSTILE_SITE_KEY` is present at build.
- `turnstile.render(..., { action: "login", ... })`; token → `window.__turnstileToken` → `x-captcha-response`.
- `resetTurnstile()` after failed email sign-in / sign-up so tokens are not reused.
- Server: Better Auth `captcha({ provider: "cloudflare-turnstile" })` enables only when **both** `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY` are set.

## Env (Joey)

| Env | Value / notes |
|-----|----------------|
| `VITE_TURNSTILE_SITE_KEY` | `0x4AAAAAAErVvyAn66cRPEas` (public) — set on **Production + Preview**, then **redeploy** (Vite inlines at build) |
| `TURNSTILE_SECRET_KEY` | Set in Vercel yourself — **never** commit or paste in chat/repo |

Cloudflare widget hostnames: `trustyoursigns.grok.me`, Vercel preview hosts, `localhost`.

## Verify

- Without site key env: no widget on `/login`.
- With both keys + rebuild: widget shows; email auth sends `x-captcha-response`; failed attempt resets challenge.
