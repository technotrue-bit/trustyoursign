# Neon connection pool

The app opens one `pg.Pool` per server process (`src/lib/db.server.ts`, max 4).
On Vercel each serverless instance is its own process, so a burst is
`instances × 4` clients against Neon.

## Production `DATABASE_URL`

Set the **pooled** connection string (PgBouncer), not the direct compute host.

|          | Host shape                                                       |
| -------- | ---------------------------------------------------------------- |
| Use this | `ep-……-pooler.<region>.aws.neon.tech`                            |
| Not this | `ep-…….<region>.aws.neon.tech` (no `-pooler` on the first label) |

In the Neon console: connection details → **Pooled connection**. Copy that
string into the Vercel project environment as `DATABASE_URL` (Production, and
Preview if those deployments talk to Neon). Do not commit it, and do not paste
it into chat or pull requests.

A direct host logs a one-line warning at pool creation. The warning does not
include the URL.

Local Postgres and the PGLite fallback are unchanged: a non-Neon host is not
treated as a misconfiguration.

## Timeouts

Starved requests fail in about 8 seconds instead of hanging until the platform
limit (~25s):

- `connectionTimeoutMillis` — waiting for a free client in this process, or for
  Neon to accept a new one
- `query_timeout` — a query that does not finish

The error is: `Database timed out before a connection or query finished.`

`scripts/migrate.mjs` uses its own one-connection pool and does not apply this
8s query timeout, so a migration is not cut off mid-file. It still reads
`DATABASE_URL`. These migrations are plain SQL in a transaction and run on the
pooled host. If a future migration needs a session feature the pooler rejects,
run that one file with the direct URL locally — do not switch Production
`DATABASE_URL` back to the direct host.

## Verify

1. Vercel → Project → Settings → Environment Variables → `DATABASE_URL`.
   The host's first label ends with `-pooler`. The password stays in Vercel.
2. Unit check: `npx tsx --test src/lib/db-pool.test.ts`.
3. After deploy, a burst that cannot get a connection returns the timeout
   error above rather than sitting until the function is killed.
