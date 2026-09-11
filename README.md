# TrustYourSign

The Vault — a natal fly-through.

Live: https://trustyoursigns.grok.me/

## Security env (required for auth)

Never commit secrets. Set in the host environment:

- `OWNER_PASSWORD` — owner desk email/password (**not** the legacy value `True`; treat that as compromised)
- `GROK_PREVIEW_CLIENT_SECRET` or `PREVIEW_CLIENT_SECRET` — live-preview OAuth client secret
- `GROK_AUTH_CLIENT_SECRET` — deployed per-app OAuth secret (overrides preview)

See `docs/security/p0-remediation-2026-09-06.md`.

## Owner authorization (immutable identity only)

Owner access is decided by **identity**, never by a display name — a name is
user-editable on every sign-in path (email/password sign-up, and the Google / X
profile name behind federated or gate sign-in).

Set **at least one** of these in the host environment, or the owner will not be
recognised after this change:

- `OWNER_EMAILS` — comma-separated emails allowed to act as owner (matched only
  when the account's email is **verified**). Recommended: the Google address you
  sign in with.
- `OWNER_ACCOUNTS` — strongest. `providerId:accountId` pairs, comma-separated
  (`google:1180…,x:1234…`), taken from the `account` table. These are the
  upstream provider's immutable subject ids and cannot be changed by the user.

Order of authority: `OWNER_EMAILS` / `OWNER_ACCOUNTS` → the recorded binding in
`site_state.owner_user_id` → the canonical `vault-owner-devin` row.

Once an identity is recognised it is recorded in `site_state.owner_user_id`, so
later requests are decided by id alone.

**Legacy escape hatch:** `OWNER_NAME_CLAIM=1` re-enables a narrow name-based
bootstrap (whole compacted name, or the handle as a standalone token) for an
owner with no allow list configured yet. It is off by default, applies only
while no real identity is bound, and logs `[owner] legacy name claim accepted`
when it fires. Set an allow list and remove it.

## Cloudflare Turnstile (optional bot protection)

Joey’s existing Cloudflare Turnstile widget — do **not** create a new one.

Set in the host environment (Vercel Production + Preview). **Never commit secrets.**

- `VITE_TURNSTILE_SITE_KEY=0x4AAAAAAErVvyAn66cRPEas` (public site key; rebuild/redeploy after setting — Vite inlines at build)
- `TURNSTILE_SECRET_KEY` — server secret, set in Vercel only (never commit or paste in chat/repo)

Both vars are required together (Better Auth captcha plugin + login widget).

Allowed hostnames on the Cloudflare widget: `trustyoursigns.grok.me`, Vercel preview hosts, `localhost`.

See `docs/security/turnstile.md`.
