# Sign-in surface: honest provider availability (+ the broken link) — design

**Scope:** the sign-in surface only — what the login page offers, what it does when a
provider cannot be served, and the code email's tap-to-sign-in link. No changes to the
gate session, preview, isolation, or the shipped scene work.

## What is broken in production today (measured on https://trustyoursign.com)

Tapping **"Continue with Google"** on the live site produces, in order:

```
200 GET  /api/auth/get-session
200 POST /api/auth/sign-out         <- clears the visitor's session
404 POST /api/auth/sign-in/oauth2   <- the endpoint does not exist on this deployment
200 GET  /api/auth/get-session      <- page stays put, no error shown
```

So the most prominent button **signs the visitor out and then silently fails**. Zero
console errors; nothing on screen explains it.

Two more findings from the same surface:

- `POST /api/auth/sign-in/magic-link` → **HTTP 500, empty body**. That is the tap-to-sign-in
  link the code email is meant to carry, so the mail ships with a dead link.
- The origin check is fine (credentialed POSTs from `trustyoursign.com` reach Better Auth) and
  the canonical host is right (`/magic-link/verify` redirects to `https://trustyoursign.com/account`,
  so the `__Host-` session cookie is set on the host the visitor browses). Neither is the bug.

## Root cause (code)

```ts
// src/lib/auth/server.ts:207
const grokOAuthPlugin = authConfigured
  ? genericOAuth({ config: GROK_PROVIDERS.map(...) })
  : null;
```

`genericOAuth` is what registers `/sign-in/oauth2`. `authConfigured` is false on this
deployment — it reflects the broker credentials (`GROK_AUTH_*`) that the Grok platform injects
in its own environment — so the route is absent and the POST 404s.

The page does not know that: `src/routes/login.tsx:292` renders the Google/X buttons straight
from the static `GROK_PROVIDERS` list, while the email-code option **is** gated on server truth
(`emailOtpAvailable` / `emailDeliveryConfigured()`). That asymmetry is the defect.

Something in the sign-in path also fires `POST /api/auth/sign-out` before the doomed attempt
(`requestSignOut: () => authClient.signOut()` in `src/lib/auth/client.ts`), which is what clears
the session. That call must not happen for a provider that cannot be served.

## Metric sheet

Baselines measured live 2026-09-15 (production), unless noted.

| id | metric | baseline | required |
|---|---|---|---|
| M1 | login page HTML: does it offer a provider the server cannot serve? | contains "Continue with Google" **and** "Continue with X" | **both absent** when the broker is unconfigured |
| M2 | same page with the broker **configured** (env present) | buttons render | buttons still render and the flow still starts — no regression for the Grok-hosted deployment |
| M3 | `POST /api/auth/sign-out` fired while on the sign-in surface with the broker unconfigured | fires | **never fires** |
| M4 | `POST /api/auth/sign-in/magic-link` | **500** | not 5xx (a clean success or a clean 4xx) |
| M5 | code path untouched: `POST /email-otp/send-verification-otp` | `{"success":true}` | unchanged |
| M6 | suite + types | 194 tests, 1 pre-existing failure (chart, not ours), typecheck clean | unchanged or better |
| M7 | console/page errors on `/login` | 0 | 0 |
| M8 | diff scope | — | confined to the sign-in surface + flag plumbing + the magic-link handler; `gate-session`, `preview`, `isolation`, and the scene files untouched |

## Mechanics

1. **Availability must come from the server**, through the same channel that already carries
   `emailOtpAvailable` (find it and reuse it — no second mechanism, no new endpoint if one
   exists).
2. **The UI renders only what can be served.** With the broker unconfigured: no Google/X block;
   the email-code path and the owner/password form remain, in the app's existing voice.
3. **No pre-emptive sign-out** for a provider that cannot be served — and a test that proves it.
4. **The code email's link must not be dead.** Fix the 500 at its cause, keeping the app's own
   rule: "the nicer path must never be the reason a visitor cannot sign in" — the code alone
   still signs you in.

## Owned files

`src/routes/login.tsx` · `src/lib/auth/client.ts` · `src/lib/auth/server.ts` ·
`src/lib/auth/providers.ts` · the magic-link/OTP send path (`src/lib/auth/sign-in-link.ts`,
`src/routes/api/auth/$.ts` if involved) · their tests · `package.json` only if a new test file
must be listed.

## Do-not-touch

`src/lib/auth/gate-session*.ts`, `src/lib/auth/isolation.server.ts`, `src/lib/auth/preview*.ts`,
`src/lib/auth/popup.server.ts`, `src/lib/galaxy/**`, `src/components/scene/**`, `scripts/qa/**`,
and anything under `src/lib/chart/**` (a second agent is editing there).

## Out of scope

Enabling the broker on the custom domain (option B — the broker's registered callback pattern is
`*.grok-sandbox.com`, so that is a broker-side decision), and any redesign of the sign-in page.

## Verification

Local: `npm run dev`, then the same live probes against `127.0.0.1:8080` (login HTML, the
sign-out trace via a headless click, the magic-link status). Deployed: after the merge, the same
probes against `https://trustyoursign.com` — M1, M3, M4, M5 re-measured there by the orchestrator.