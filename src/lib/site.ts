import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { isSiteOwner, SITE_OWNER, OWNER_USER_ID } from "./owner";

/** Owner desk login. Kept server-side only. */
const OWNER_PASSWORD = "True";

async function ensureOwnerAccount() {
  const sql = await getSql();
  const { hashPassword } = await import("better-auth/crypto");
  const hash = await hashPassword(OWNER_PASSWORD);
  const id = OWNER_USER_ID;
  const email = SITE_OWNER.email;
  const name = SITE_OWNER.name;
  await sql`
    insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
    values (${id}, ${name}, ${email}, true, now(), now())
    on conflict ("email") do update set "name" = excluded."name", "updatedAt" = now()
  `;
  const acc = await sql<{ id: string }>`
    select "id" from "account" where "userId" = ${id} and "providerId" = 'credential'
  `;
  if (acc.length === 0) {
    await sql`
      insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
      values (${`${id}-cred`}, ${id}, 'credential', ${id}, ${hash}, now(), now())
    `;
  } else {
    await sql`
      update "account" set "password" = ${hash}, "updatedAt" = now()
      where "userId" = ${id} and "providerId" = 'credential'
    `;
  }
  await sql`
    update site_state
    set owner_user_id = ${id}, owner_name = ${name}, owner_handle = ${SITE_OWNER.handle}
    where id = 'vault'
  `;
}

export const primeOwner = createServerFn({ method: "GET" }).handler(async () => {
  await ensureOwnerAccount();
  return { ok: true };
});

function previewDeskOpen() {
  if (process.env.VERCEL) return false;
  if (process.env.GROK_AUTH_CLIENT_SECRET && process.env.DATABASE_URL) return false;
  return true;
}

/** Live-preview only: mint a bearer for the owner so the desk stays open. Never on Vercel. */
export const bindOwnerPreview = createServerFn({ method: "POST" }).handler(async () => {
  if (!previewDeskOpen()) return { token: null as string | null, owner: false as const };
  await ensureOwnerAccount();
  const { auth } = await import("@/lib/auth/server");
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: SITE_OWNER.email,
        password: OWNER_PASSWORD,
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
    await ensureOwnerAccount();
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
