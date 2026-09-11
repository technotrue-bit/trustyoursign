import { AsyncLocalStorage } from "node:async_hooks";

export type RlsContext = {
  userId?: string;
  isOwner?: boolean;
  /** Server-only bootstrap paths (never expose over HTTP). */
  bypass?: boolean;
};

/**
 * Request-scoped Postgres RLS GUC context for `getSql()` queries.
 * Policies in migrations/0007_rls.sql read `app.user_id` / `app.is_owner` / `app.rls_bypass`.
 *
 * `.server.ts` suffix is required — a static `node:async_hooks` import in a dual
 * module ships to the browser and kills the galaxy (`AsyncLocalStorage is not a constructor`).
 */
export class AppRls {
  static #als = new AsyncLocalStorage<RlsContext>();

  static run<T>(ctx: RlsContext, fn: () => Promise<T>): Promise<T> {
    return this.#als.run(ctx, fn);
  }

  static forUser<T>(
    userId: string,
    fn: () => Promise<T>,
    opts?: { isOwner?: boolean },
  ): Promise<T> {
    return this.run({ userId, isOwner: Boolean(opts?.isOwner) }, fn);
  }

  static bypass<T>(fn: () => Promise<T>): Promise<T> {
    return this.run({ bypass: true }, fn);
  }

  static current(): RlsContext | undefined {
    return this.#als.getStore();
  }
}
