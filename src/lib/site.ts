import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { AppRls } from "@/lib/db-rls";
import { isSiteOwner, SITE_OWNER, OWNER_USER_ID } from "./owner";

/**
 * Owner desk credentials — env only. The legacy hardcoded value `True` is
 * treated as compromised and rejected even if someone sets it in env.
 */
class OwnerPassword {
  static readonly COMPROMISED = "True";

  static read(): string | undefined {
    const value = process.env.OWNER_PASSWORD?.trim();
    if (!value) return undefined;
    if (value === OwnerPassword.COMPROMISED) return undefined;
    return value;
  }

  static isProd(): boolean {
    return Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  }

  /** Fail closed when production (or Vercel) has no usable OWNER_PASSWORD. */
  static require(): string {
    const password = OwnerPassword.read();
    if (password) return password;
    throw new Error(
      OwnerPassword.isProd()
        ? "OWNER_PASSWORD must be set to a strong secret in deployment env (legacy value rejected)"
        : "OWNER_PASSWORD is not configured",
    );
  }
}

/**
 * Owner account bootstrap. Never overwrites an existing credential hash from
 * public HTTP. Seed insert-only when password env is present.
 */
class OwnerAccount {
  static async ensure(opts?: { seedCredential?: boolean }) {
    const sql = await getSql();
    const id = OWNER_USER_ID;
    const email = SITE_OWNER.email;
    const name = SITE_OWNER.name;

    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${id}, ${name}, ${email}, true, now(), now())
      on conflict ("email") do update set "name" = excluded."name", "updatedAt" = now()
    `;

    if (opts?.seedCredential) {
      const password = OwnerPassword.read();
      if (password) {
        const { hashPassword } = await import("better-auth/crypto");
        const hash = await hashPassword(password);
        const acc = await sql<{ id: string }>`
          select "id" from "account" where "userId" = ${id} and "providerId" = 'credential'
        `;
        if (acc.length === 0) {
          await sql`
            insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
            values (${`${id}-cred`}, ${id}, 'credential', ${id}, ${hash}, now(), now())
          `;
        }
        // Existing credential: never reset from here (closes public hash-reset).
      } else if (OwnerPassword.isProd()) {
        throw new Error("OWNER_PASSWORD must be set to seed the owner credential in production");
      }
    }

    await sql`
      update site_state
      set owner_user_id = ${id}, owner_name = ${name}, owner_handle = ${SITE_OWNER.handle}
      where id = 'vault'
    `;
  }

  /** Cold-start seed: server-only, not an HTTP server fn. */
  static bootstrap() {
    return AppRls.bypass(async () => {
      try {
        await OwnerAccount.ensure({ seedCredential: true });
      } catch {
        // Preview without OWNER_PASSWORD stays inert; production login simply fails closed.
      }
    });
  }
}

// Server module init only — not exposed as createServerFn. Skip in the browser:
// this file is imported from OwnerBind as RPC stubs.
if (typeof document === "undefined") {
  void OwnerAccount.bootstrap();
}

function previewDeskOpen() {
  if (process.env.VERCEL) return false;
  if (process.env.GROK_AUTH_CLIENT_SECRET && process.env.DATABASE_URL) return false;
  return true;
}

/**
 * Live-preview only: mint a bearer for the owner so the desk stays open.
 * Requires OWNER_PASSWORD in env. Never on Vercel. Not a public password reset.
 */
export const bindOwnerPreview = createServerFn({ method: "POST" }).handler(async () => {
  if (!previewDeskOpen()) return { token: null as string | null, owner: false as const };
  const password = OwnerPassword.read();
  if (!password) return { token: null as string | null, owner: false as const };

  await AppRls.bypass(async () => {
    await OwnerAccount.ensure({ seedCredential: true });
  });

  const { auth } = await import("@/lib/auth/server");
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: SITE_OWNER.email,
        password,
        rememberMe: true,
      },
    });
    const row = result as { token?: string; session?: { token?: string } } | null;
    const token = row?.token ?? row?.session?.token ?? null;
    return { token, owner: Boolean(token) };
  } catch {
    return { token: null as string | null, owner: false as const };
  }
});

export const claimSite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // Sync site_state pointer only — never touch credential hashes here.
    await AppRls.bypass(async () => {
      await OwnerAccount.ensure({ seedCredential: false });
    });

    if (context.userId === OWNER_USER_ID) {
      return { owner: true as const, ...SITE_OWNER };
    }
    const token = "bearerToken" in context ? (context as { bearerToken?: string }).bearerToken : undefined;
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const { auth } = await import("@/lib/auth/server");
    const request = getRequest();
    let name: string | null = null;
    let email: string | null = null;
    if (request) {
      let headers = request.headers;
      if (token) {
        headers = new Headers(request.headers);
        headers.set("Authorization", `Bearer ${token}`);
      }
      const session = await auth.api.getSession({ headers });
      name = session?.user?.name ?? null;
      email = session?.user?.email ?? null;
    }
    const verified = await getSessionUser(token);
    email = verified?.email ?? email;
    const ok = isSiteOwner({ displayName: name, primaryEmail: email });
    if (!ok) return { owner: false as const, ...SITE_OWNER };

    const sql = await getSql();
    const rows = await sql<{ owner_user_id: string | null }>`
      select owner_user_id from site_state where id = 'vault'
    `;
    const current = rows[0]?.owner_user_id ?? null;
    if (current && current !== context.userId && current !== OWNER_USER_ID) {
      return { owner: false as const, ...SITE_OWNER };
    }
    return { owner: true as const, ...SITE_OWNER };
  });
