export type RlsContext = {
  userId?: string;
  isOwner?: boolean;
  /** Server-only bootstrap paths (never expose over HTTP). */
  bypass?: boolean;
};

type Als = {
  run<R>(store: RlsContext, fn: () => R): R;
  getStore(): RlsContext | undefined;
};

type NodeProcess = {
  getBuiltinModule?: (id: string) => { AsyncLocalStorage?: new <T>() => Als };
};

/**
 * Do not `import "node:async_hooks"` from this file. Vite puts this module in
 * the client graph (via getSql / site RPC stubs); a static node import crashes
 * the galaxy (`AsyncLocalStorage is not a constructor`).
 */
function createAls(): Als | null {
  const proc = (globalThis as { process?: NodeProcess }).process;
  const load = proc?.getBuiltinModule;
  if (typeof load !== "function") return null;
  try {
    const AsyncLocalStorage = load("node:async_hooks")?.AsyncLocalStorage;
    if (typeof AsyncLocalStorage !== "function") return null;
    return new AsyncLocalStorage<RlsContext>();
  } catch {
    return null;
  }
}

/**
 * Request-scoped Postgres RLS GUC context for `getSql()` queries.
 * Policies in migrations/0007_rls.sql read `app.user_id` / `app.is_owner` / `app.rls_bypass`.
 */
export class AppRls {
  static #als = createAls();

  static run<T>(ctx: RlsContext, fn: () => Promise<T>): Promise<T> {
    if (!this.#als) return fn();
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
    return this.#als?.getStore();
  }
}
