# TrustYourSign — Official Closed Beta

**Status date:** 2026-09-26 (America/New_York)
**Snapshot:** `main` at `90903d6` · sky chrome **Closed beta · V.38**
**Audience:** Joey (status, not a changelog)

This is the official Closed Beta snapshot. The live product is already on `main` and Production. This file records what shipped and where we stand. Merging it is optional (docs only) and waits for Joey’s yes.

An earlier readiness write-up lives at `docs/reviews/2026-09-14-pre-beta-review.md`. That review is historical. This file is the standing as of the date above.

## Live hosts

| Role | Host |
|---|---|
| Primary (Production) | https://trustyoursign.com/ |
| Legacy (still named in some docs) | https://trustyoursigns.grok.me/ |

The repo homepage still lists `https://trustyoursigns.grok.me/` as Live (`README.md`). Treat that hostname as legacy. This snapshot does not rewrite the README or the security docs that still mention it.

## What’s in Closed Beta

Shipped on `main` / Production. Grouped by what a visitor or operator actually gets.

### Product / experience

The house is **The Vault**: a natal fly-through through a galaxy corridor.

- Home sky HUD, including the **Closed beta · V.38** chip (the chip stays while the version is below 1.0).
- Sign corridor fly, with dwell clips (Aries, Leo, Aquarius, and the rest of that series) and life clips that play on dwell.
- Performance work already on Production: WebP plates, station clouds deferred until approach, intro GPU throttling, a pre-baked nebula wallpaper, and a liquid corridor fly (one plate owns the frame, sign to sign).
- Mobile HUD and overlay fixes for safe area, collisions, and type contrast on a bright sky.
- PWA install chrome branded Trust Your Sign on the custom domain (#89 era).
- Passkey sign-in prefers the platform authenticator on iPhone (local Face ID over a QR / USB hybrid). Intermittent hardening on that path may still be in flight.

### Feedback loop

Verified 2026-09-26. The home HUD has a circular feedback orb. It opens the same form as `/contact`.

Path: orb or `/contact` → `POST /api/feedback` → Resend → `tys-feedback@agentmail.to` (AgentMail). Ultron’s weekday intake routine polls that inbox for triage.

| Check | Result |
|---|---|
| Resend domain `trustyoursign.com` | Verified ~6:20 AM ET 2026-09-26 (Vercel DNS) |
| Production `Email_From` | `TrustYourSign <feedback@trustyoursign.com>` |
| API probe | Token `ULTRON-ORB-PROBE-20260926-0620` passed |
| Live orb UI | Token `ULTRON-ORB-UI-20260926-0633` passed; success copy is “Got it — Ultron will triage this.” |

Landed as #143 (orb) and #144 (support-orb greeting bubble). The contact form itself landed earlier as #93.

### Auth / security posture

High level only. No secrets live in this file.

- Owner auth is by immutable identity, not display name.
- Email OTP (6-digit code) goes through Resend when `RESEND_API_KEY` and `EMAIL_FROM` are set on the host. The option does not render when mail is unconfigured.
- Cloudflare Turnstile is optional bot protection. Joey’s existing widget is the one in use.
- Security headers and a durable feedback rate limit (5 notes / 15 minutes per client) landed earlier. The full Security CLEAR gate stays parked until Joey or Security reopens it. This snapshot does **not** claim CLEAR.

## Where we stand (2026-09-26)

- Closed Beta is live for visitors on https://trustyoursign.com/.
- The feedback orb works end to end: UI → Resend → AgentMail.
- Engineering still has open pull requests. This snapshot does not merge them:
  - [#138](https://github.com/technotrue-bit/trustyoursign/pull/138) (draft) — Intro: bail hidden stations before art preload.
  - [#109](https://github.com/technotrue-bit/trustyoursign/pull/109) — docs: point Live host at trustyoursign.com (GATE-HEADERS-LIVE). May be stale relative to a host that is already live; README on `main` still names the legacy Grok host.
  - [#102](https://github.com/technotrue-bit/trustyoursign/pull/102) — fix(nav): stop galaxy fly from eating account menu taps. Historically conflicting with `main`.
- Parked Security CLEAR and OPS-2/3 stay parked unless Joey reopens them.
- Scale topics (deadlocks, distributed locks, custom load balancers, and the like) are not Closed Beta blockers. Vercel and Neon cover most operations. The care that matters here is rollbacks and basic performance and security.

## Recent merged milestones (selective)

Evidence, not an exhaustive changelog.

| Area | PRs |
|---|---|
| Feedback orb | [#143](https://github.com/technotrue-bit/trustyoursign/pull/143), [#144](https://github.com/technotrue-bit/trustyoursign/pull/144) |
| Corridor, dwell, and performance | roughly [#116](https://github.com/technotrue-bit/trustyoursign/pull/116)–[#142](https://github.com/technotrue-bit/trustyoursign/pull/142) |
| Contact form → AgentMail | [#93](https://github.com/technotrue-bit/trustyoursign/pull/93) |
| Passkey Face ID preference | roughly [#76](https://github.com/technotrue-bit/trustyoursign/pull/76)–[#78](https://github.com/technotrue-bit/trustyoursign/pull/78) |
| PWA custom-domain branding | [#89](https://github.com/technotrue-bit/trustyoursign/pull/89) |
| Headers + feedback rate limit | [#108](https://github.com/technotrue-bit/trustyoursign/pull/108) |

## Out of scope for this snapshot

- No product, UI, or feature changes.
- No repository visibility change. Private stays private until Joey says otherwise.
- No rewrite of README secret or security sections.
- No merge of unfinished engineering PRs, and no claim that Security CLEAR has passed.
