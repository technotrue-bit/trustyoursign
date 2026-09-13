/**
 * Client-safe SQL types. The driver lives in `db.server.ts` — never import that
 * file from a React component. Dual modules (charts/sky/site RPC stubs) must
 * dynamic-import `db.server` inside a createServerFn handler.
 */
export type DbSource = "neon" | "pglite";

export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}
