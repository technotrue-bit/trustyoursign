import { getSql } from "@/lib/db.server";
import { AppRls } from "@/lib/db-rls.server";
import { assertSiteOwner } from "./owner.server";
import { SITE_OWNER, OWNER_USER_ID } from "./owner";

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
}

class OwnerAccount {
  static async ensure(opts?: { seedCredential?: boolean }) {
    const sql = await getSql();
    const id = OWNER_USER_ID;
    const email = SITE_OWNER.email;
    const name = SITE_OWNER.name;

    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${id}, ${name}, ${email}, true, now(), now())
      on conflict ("id") do update
        set "name" = excluded."name",
            "email" = excluded."email",
            "emailVerified" = true,
            "updatedAt" = now()
    `;

    if (opts?.seedCredential) {
      const password = OwnerPassword.read();
      if (password) {
        const { hashPassword, verifyPassword } = await import("better-auth/crypto");
        const acc = await sql<{ id: string; password: string | null }>`
          select "id", "password" from "account"
          where "userId" = ${id} and "providerId" = 'credential' limit 1
        `;
        const existing = acc[0];
        if (!existing) {
          const hash = await hashPassword(password);
          await sql`
            insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
            values (${`${id}-cred`}, ${id}, 'credential', ${id}, ${hash}, now(), now())
          `;
        } else {
          // The env var is the source of truth: if OWNER_PASSWORD has changed
          // since the hash was written, rotate it. Without this the original
          // (possibly leaked) password keeps working and a rotation silently
          // does nothing — the hash used to be written once and never updated.
          const matches = existing.password
            ? await verifyPassword({ hash: existing.password, password })
            : false;
          if (!matches) {
            const hash = await hashPassword(password);
            await sql`
              update "account" set "password" = ${hash}, "updatedAt" = now()
              where "id" = ${existing.id}
            `;
            console.warn("[owner] OWNER_PASSWORD changed — rotated the owner credential hash");
          }
        }
      } else if (OwnerPassword.isProd()) {
        throw new Error("OWNER_PASSWORD must be set to seed the owner credential in production");
      }
    }

    await sql`
      update site_state
      set owner_user_id = coalesce(owner_user_id, ${id}),
          owner_name = ${name},
          owner_handle = ${SITE_OWNER.handle}
      where id = 'vault'
    `;
  }

  static bootstrap() {
    return AppRls.bypass(async () => {
      try {
        await OwnerAccount.ensure({ seedCredential: true });
      } catch (err) {
        // Expected in the live preview when OWNER_PASSWORD is unset — owner
        // sign-in stays inert there. But when a password IS configured (or we
        // are deployed), a failure means owner sign-in is broken — most likely
        // the target owner email already belongs to another account — and must
        // reach the host logs rather than vanish.
        if (OwnerPassword.read() || OwnerPassword.isProd()) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(
            "[owner] bootstrap FAILED — owner sign-in will not work until this is fixed:",
            message,
          );
        }
      }
    });
  }
}

void OwnerAccount.bootstrap();

function previewDeskOpen() {
  if (process.env.VERCEL) return false;
  if (process.env.GROK_AUTH_CLIENT_SECRET && process.env.DATABASE_URL) return false;
  return true;
}

export async function bindOwnerPreviewImpl() {
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
}

export async function claimSiteImpl(context: { userId: string; bearerToken?: string }) {
  await AppRls.bypass(async () => {
    await OwnerAccount.ensure({ seedCredential: false });
  });

  // One authorization path for the whole app: the same immutable-identity check
  // the owner-only server functions use. `bearerToken` is retained for call-site
  // compatibility — identity now comes from the user row, never a session name.
  try {
    await assertSiteOwner(context.userId);
    return { owner: true as const, ...SITE_OWNER };
  } catch {
    return { owner: false as const, ...SITE_OWNER };
  }
}
