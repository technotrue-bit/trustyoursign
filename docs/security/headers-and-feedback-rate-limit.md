# Security headers (P1-18)

Document / API responses set these via three parallel paths (keep in sync):

1. `scripts/security-headers.mjs` — canonical values
2. `vercel.json` — edge on deploy
3. Vite plugin + Nitro `server/middleware/00-security-headers.ts` — local / preview / function

**CSP `style-src 'unsafe-inline'`:** required for the FOUC blocker in `src/routes/__root.tsx` and React `style={{…}}` attributes. `script-src` does **not** allow `'unsafe-inline'` (Grok injector + Turnstile + app modules are external / `'self'`).

**Framing:** `frame-ancestors` (not `X-Frame-Options`) so Grok / sandbox preview embeds keep working while arbitrary origins cannot frame the app.

Probe locally:

```bash
node scripts/assert-security-headers.mjs http://127.0.0.1:8080/
```

# Feedback rate limit (P1-FEEDBACK)

`/api/feedback` uses Postgres table `feedback_rate_limit` (migration `0009_feedback_rate_limit.sql`): **5 posts / 15 minutes** per hashed client IP. Unit tests inject a memory store — no live DB required. Mail still needs env-only `RESEND_API_KEY` + `EMAIL_FROM` (503 + mailto fallback when unset).

# Auth / OTP rate limit

Better Auth's limiter (`src/lib/auth/rate-limit.ts`) uses `storage: "database"` and table `"rateLimit"` (migration `0010_auth_rate_limit.sql`). OTP send is 3/minute, OTP verify 5/minute, plus the sign-in / sign-up / passkey rules in that file. Counters are shared across serverless instances. There is no Redis. The table stores the limiter key (IP + path), not the code.
