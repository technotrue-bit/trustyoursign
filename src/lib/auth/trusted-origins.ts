/**
 * Extra origins Better Auth should accept on credentialed POSTs.
 *
 * `trustedOrigins` is derived from `BETTER_AUTH_URL` (the canonical origin, e.g.
 * the `*.grok.me` deployment). When that is set, the list carries ONLY the
 * canonical origin plus localhost — so signing in from any other host that
 * serves the same app fails with `INVALID_ORIGIN` *before the credentials are
 * ever read*. That is what a `*.vercel.app` deployment URL is: a real, working
 * copy of the app whose sign-in is impossible.
 *
 * Vercel injects the hostnames of this project's OWN deployments, so trusting
 * them needs no configuration and stays scoped to this project:
 *
 *   VERCEL_PROJECT_PRODUCTION_URL  the project's production domain
 *   VERCEL_URL                     the specific deployment being served
 *   VERCEL_BRANCH_URL              the branch alias
 *
 * `AUTH_TRUSTED_ORIGINS` (comma/space separated) adds anything else — a custom
 * domain, say — without a code change. Deliberately NOT `*.vercel.app`: that
 * would trust every unrelated app on the platform.
 */

/** Split a `AUTH_TRUSTED_ORIGINS`-style list, trimming and dropping blanks. */
export function parseOriginList(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/[\s,]+/)
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/** `host` and `https://host` for a bare hostname (or a full origin, left as is). */
function hostForms(raw: string | null | undefined): string[] {
  const host = (raw ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!host) return [];
  return [host, `https://${host}`];
}

/**
 * Origins to append to `trustedOrigins`. Order is stable and duplicates are
 * removed so the resulting config is deterministic for tests.
 */
export function extraTrustedOrigins(env: Record<string, string | undefined>): string[] {
  const out: string[] = [];
  for (const key of ["VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL", "VERCEL_BRANCH_URL"] as const) {
    out.push(...hostForms(env[key]));
  }
  for (const entry of parseOriginList(env.AUTH_TRUSTED_ORIGINS)) {
    out.push(entry);
    // A full origin is matched against Origin, a bare host against the host —
    // supply both so either form works.
    if (/^https?:\/\//.test(entry)) out.push(entry.replace(/^https?:\/\//, ""));
  }
  return [...new Set(out)];
}
