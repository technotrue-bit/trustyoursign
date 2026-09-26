/**
 * Neon pool settings for serverless.
 *
 * Each Vercel instance builds its own `pg.Pool`. A direct Neon compute host
 * has a small connection ceiling, so a burst of instances each holding `max`
 * clients queues until the platform kills the request (~25s). The pooled
 * (PgBouncer) host absorbs that. Point `DATABASE_URL` at it in the host
 * environment — never commit the URL.
 *
 * Timeouts fail a starved checkout or a stuck query instead of waiting out
 * the platform limit. `connectionTimeoutMillis` covers both a new TCP
 * connection and a wait for a free client in this process's pool.
 */

export const NEON_POOL_MAX = 4;
export const NEON_QUERY_TIMEOUT_MS = 8_000;
export const NEON_CONNECTION_TIMEOUT_MS = 8_000;
export const NEON_IDLE_TIMEOUT_MS = 10_000;

export type NeonHostKind = "pooled" | "direct" | "other";

/** Classify a connection string without echoing it. */
export function neonHostKind(connectionString: string): NeonHostKind {
  let host = "";
  try {
    host = new URL(connectionString).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (!host.endsWith(".neon.tech")) return "other";
  const label = host.split(".")[0] ?? "";
  return label.endsWith("-pooler") ? "pooled" : "direct";
}

/**
 * One-line ops warning when Production is still on the direct compute host.
 * Does not include the URL or host.
 */
export function directNeonHostWarning(kind: NeonHostKind): string | null {
  if (kind !== "direct") return null;
  return (
    "[db] DATABASE_URL is a Neon direct compute host. Each serverless instance " +
    "opens its own pool, so bursts exhaust the compute connection limit and " +
    "requests hang. Set DATABASE_URL to the pooled host (the first DNS label " +
    'ends with "-pooler", for example ep-…-pooler.<region>.aws.neon.tech) in ' +
    "the Vercel project environment. Do not commit the URL."
  );
}

export function databaseTimeoutError(err: unknown): Error | null {
  const message = err instanceof Error ? err.message : String(err);
  if (!/timeout/i.test(message)) return null;
  const wrapped = new Error(
    "Database timed out before a connection or query finished. " +
      "The request was stopped instead of hanging. " +
      'In production, DATABASE_URL must be the Neon pooled host (the hostname label ends with "-pooler").',
  );
  wrapped.cause = err;
  return wrapped;
}

export function neonPoolConfig(connectionString: string) {
  return {
    connectionString,
    max: NEON_POOL_MAX,
    connectionTimeoutMillis: NEON_CONNECTION_TIMEOUT_MS,
    query_timeout: NEON_QUERY_TIMEOUT_MS,
    idleTimeoutMillis: NEON_IDLE_TIMEOUT_MS,
    allowExitOnIdle: true,
  };
}
