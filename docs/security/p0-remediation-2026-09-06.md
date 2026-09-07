# P0 security remediation — 2026-09-06

Draft remediation for Vibecode checklist blockers (see audit PR / `docs/security/vibecode-checklist-2026-09-06.md` when merged). **No public deploy claim in this change.**

## Design-first (subtract before add)

| Item | Action |
|------|--------|
| Hardcoded `OWNER_PASSWORD = "True"` | **Removed.** Read `OWNER_PASSWORD` from env only; reject legacy `True` as compromised. |
| Unauthenticated `primeOwner` | **Deleted.** No public HTTP path resets the owner credential hash. |
| Hardcoded `PREVIEW_CLIENT_SECRET` | **Removed from tree.** Load via `PreviewOAuthSecret.read()` (`GROK_PREVIEW_CLIENT_SECRET` or `PREVIEW_CLIENT_SECRET`). |
| No Postgres RLS | **Added** `migrations/0007_rls.sql` + `AppRls` request GUCs on `getSql()`. |
| No login rate limit / bots | Better Auth `rateLimit` (strict email rules) + login honeypot; optional Turnstile when `TURNSTILE_SECRET_KEY` is set. |

## Required env (Joey)

Set in deployment (Vercel / host). **Do not commit values.**

| Var | Purpose |
|-----|---------|
| `OWNER_PASSWORD` | Strong owner desk password (email/password). **Rotate** — legacy `True` is compromised and rejected. |
| `GROK_PREVIEW_CLIENT_SECRET` or `PREVIEW_CLIENT_SECRET` | Preview OAuth client secret (sandbox). Prefer broker-issued secret. |
| `GROK_AUTH_CLIENT_SECRET` | Per-app OAuth secret when deployed (overrides preview). |
| `TURNSTILE_SECRET_KEY` (optional) | Server secret for Better Auth captcha plugin (Cloudflare Turnstile). Set in Vercel only — **never** commit or paste in chat/repo. |
| `VITE_TURNSTILE_SITE_KEY` (optional) | Client site key (public). Joey’s existing widget: `0x4AAAAAAErVvyAn66cRPEas` — set on Vercel **Production + Preview**. |

**Turnstile (Joey’s existing Cloudflare widget — do not create a new one):**

- Both `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY` are required together (Better Auth captcha plugin + login widget).
- Rebuild/redeploy after setting `VITE_TURNSTILE_SITE_KEY` (Vite inlines it at build time).
- Allowed hostnames on the Cloudflare widget: `trustyoursigns.grok.me`, Vercel preview hosts, `localhost`.
- Never paste `TURNSTILE_SECRET_KEY` into chat or the repo.

## Rotate steps (Joey) — preview OAuth

1. In the Grok auth broker / provider console, create a **new** preview OAuth client secret.
2. Set `GROK_PREVIEW_CLIENT_SECRET` (preview) and/or `GROK_AUTH_CLIENT_SECRET` (deployed app) in host env.
3. **Revoke** the old secret that was previously committed to git history.
4. Redeploy so only env-backed secrets are used.

## Rotate steps (Joey) — owner password

1. Generate a strong new `OWNER_PASSWORD` (password manager).
2. Set it in deployment env (**never** use `True`).
3. On first boot with the new env var, the owner credential is seeded **only if** no credential row exists; if an old hash remains, update/reset via a controlled admin path or DB credential replace after signing in another way — do not reintroduce a public `primeOwner`.

## Proof commands (redacted)

```bash
rg -n 'OWNER_PASSWORD\\s*=\\s*"True"|PREVIEW_CLIENT_SECRET\\s*=' src/
rg -n 'primeOwner' src/
rg -n 'ROW LEVEL SECURITY|CREATE POLICY|force row level security' migrations/
rg -n 'rateLimit|captcha|hpCompany' src/
```

Expect: no hardcoded owner password assignment; no preview secret assignment; no `primeOwner`; RLS migration present; rate limit + honeypot present.
