# TrustYourSign

The Vault — a natal fly-through.

Live: https://trustyoursign.com/

## Security env (required for auth)

Never commit secrets. Set in the host environment:

- `OWNER_PASSWORD` — owner desk email/password (**not** the legacy value `True`; treat that as compromised)
- `GROK_PREVIEW_CLIENT_SECRET` or `PREVIEW_CLIENT_SECRET` — live-preview OAuth client secret
- `GROK_AUTH_CLIENT_SECRET` — deployed per-app OAuth secret (overrides preview)
- `ALLOW_PREVIEW_OWNER_BIND=1` — required before the live-preview / localhost
  owner desk may sign in as the owner. Unset fails closed. Do not set this on
  Vercel (Production or Preview). A preview host header alone is not enough.

See `docs/security/p0-remediation-2026-09-06.md`.

## Database (`DATABASE_URL`)

Production must use Neon’s **pooled** connection string (PgBouncer). The host’s
first label ends with `-pooler` (`ep-…-pooler.<region>.aws.neon.tech`). The
direct compute host exhausts under serverless bursts — each instance keeps its
own pool of 4 — and requests used to hang ~25s. Starved checkouts and queries
now fail in about 8 seconds. Set the URL in Vercel only. Details:
`docs/ops/neon-pool.md`.

## Owner authorization (immutable identity only)

Owner access is decided by **identity**, never by a display name — a name is
user-editable on every sign-in path (email/password sign-up, and the Google / X
profile name behind federated or gate sign-in).

### Signing in as the owner

Set `OWNER_PASSWORD` in the host environment, then sign in at `/login` with
either:

- the owner email (`SITE_OWNER.email` in `src/lib/owner.ts`) + that password, or
- the identifier `ADMIN` + that password (`ADMIN` is an alias for the same
  account).

Both resolve to the canonical `vault-owner-devin` row, which is authorised
unconditionally — **no allow list is required for this path**. Use the _Sign in_
tab, not _Create account_.

`OWNER_PASSWORD` is read from the environment on every boot and the credential
hash is **rotated whenever it changes**, so changing the env var is a real
password change. The legacy value `True` is rejected as compromised.
`OwnerAccount.ensure` also re-points the canonical row at `SITE_OWNER.email`, so
changing that address moves the owner login with it.

### Recognising other identities (federated sign-in)

To be recognised while signed in with Google / X instead, set one of:

- `OWNER_EMAILS` — comma-separated emails, matched **only when the account's
  email is verified**. Note email/password accounts are never verified (no
  verification flow is configured), so this is for federated identities.
- `OWNER_ACCOUNTS` — strongest. `providerId:accountId` pairs, comma-separated
  (`google:1180…,x:1234…`), taken from the `account` table. These are the
  upstream provider's immutable subject ids and cannot be changed by the user.

Order of authority: `OWNER_EMAILS` / `OWNER_ACCOUNTS` → the recorded binding in
`site_state.owner_user_id` → the canonical `vault-owner-devin` row.

Once an identity is recognised it is recorded in `site_state.owner_user_id`, so
later requests are decided by id alone.

If the owner email is already held by a _different_ account, bootstrap fails and
logs `[owner] bootstrap FAILED — owner sign-in will not work until this is
fixed`. Check before deploying:

```sql
select "id", "email" from "user" where lower("email") = lower('<SITE_OWNER.email>');
```

**Legacy escape hatch:** `OWNER_NAME_CLAIM=1` re-enables a narrow name-based
bootstrap (whole compacted name, or the handle as a standalone token) for an
owner with no allow list configured yet. It is off by default, applies only
while no real identity is bound, and logs `[owner] legacy name claim accepted`
when it fires. Set an allow list and remove it.

## Sign-in by email code (password-free)

"Email me a code instead" — or the **Use Apple or iCloud email** button — signs a
visitor in with a 6-digit code instead of a password. A first-time code creates
the account.

Set in the host environment (**Production _and_ Preview**) or the option simply
does not render — there is no half-configured state and no button that cannot
complete:

- `RESEND_API_KEY` — provider API key
- `EMAIL_FROM` — the from-address, on a domain verified with the provider
  (use `onboarding@resend.dev` to trial it before verifying a domain)
- `EMAIL_REPLY_TO` — optional
- `EMAIL_API_URL` — optional; points the same request shape at another endpoint
  (a regional host, a self-hosted gateway)

Behaviour worth knowing:

- Codes are **6 digits, expire in 5 minutes, work once, and are stored hashed**
  (`verification.value` never holds a usable code). Five attempt limit.
- The send path is rate-limited to **3/minute per IP** (verify: 5/minute). Counters
  live in Postgres (`"rateLimit"`, migration `0010`), shared across serverless
  instances — not in process memory.
- **Acceptance is required before a code is sent.** A first-time code creates the
  account, so the age and terms boxes must be ticked to be emailed a code — on
  both tabs, not just _Create account_. They are hidden again once a code is out,
  since acceptance is what unlocked sending it.
- Editing the address after a code is sent steps back to the send step, so the
  visitor is never left typing a code that cannot verify.
- **The owner can use this path too** — a code sent to `SITE_OWNER.email`
  resolves to the canonical `vault-owner-devin` row, so owner rights apply and
  the redirect goes to `/admin`.
- To move providers, replace `sendEmail` in `src/lib/email/send.server.ts`; the
  message copy lives in `src/lib/email/otp-message.ts`.

## Cloudflare Turnstile (optional bot protection)

Joey’s existing Cloudflare Turnstile widget — do **not** create a new one.

Set in the host environment (Vercel Production + Preview). **Never commit secrets.**

- `VITE_TURNSTILE_SITE_KEY=0x4AAAAAAErVvyAn66cRPEas` (public site key; rebuild/redeploy after setting — Vite inlines at build)
- `TURNSTILE_SECRET_KEY` — server secret, set in Vercel only (never commit or paste in chat/repo)

Both vars are required together (Better Auth captcha plugin + login widget).

Allowed hostnames on the Cloudflare widget: `trustyoursign.com` (Production custom domain), Vercel preview hosts, `localhost`. Legacy/stale: `trustyoursigns.grok.me`.

See `docs/security/turnstile.md`.
