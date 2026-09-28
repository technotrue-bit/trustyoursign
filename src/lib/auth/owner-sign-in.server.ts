import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";
import { AppRls } from "@/lib/db-rls.server";
import { getSql } from "@/lib/db.server";
import { OWNER_USER_ID, SITE_OWNER } from "@/lib/owner";
import { ownerPasswordMatches, readOwnerPassword } from "@/lib/owner-password.server";
import { emitHostSessionCookie } from "./session-cookie.server.ts";

/**
 * When another account already holds the owner address, Better Auth signs
 * that row in — and its password is not the operator secret, so the canonical
 * row never gets the session. Claim then stays unbound.
 *
 * If the submitted password is the operator secret, open a session on the
 * canonical row instead. A display name is never consulted. A wrong password
 * falls through to the normal sign-in.
 */
export function ownerCanonicalSignIn(): BetterAuthPlugin {
  return {
    id: "owner-canonical-sign-in",
    hooks: {
      before: [
        {
          matcher(context) {
            return context.path === "/sign-in/email";
          },
          handler: createAuthMiddleware(async (ctx) => {
            const body = ctx.body as { email?: unknown; password?: unknown; rememberMe?: unknown; callbackURL?: unknown };
            const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
            const password = typeof body.password === "string" ? body.password : "";
            if (email !== SITE_OWNER.email || !password) return;

            const expected = readOwnerPassword();
            if (!expected || !ownerPasswordMatches(password, expected)) return;

            try {
              const ready = await ensureCanonicalOwnerRow();
              if (!ready) {
                console.warn("[owner] canonical sign-in skipped", { reason: "no-row" });
                return;
              }
              const user = await ctx.context.internalAdapter.findUserById(OWNER_USER_ID);
              if (!user) {
                console.warn("[owner] canonical sign-in skipped", { reason: "no-row" });
                return;
              }
              const remember = body.rememberMe !== false;
              const session = await ctx.context.internalAdapter.createSession(user.id, !remember);
              if (!session?.token) {
                console.warn("[owner] canonical sign-in skipped", { reason: "no-session" });
                return;
              }
              await setSessionCookie(ctx, { session, user }, !remember);
              await emitHostSessionCookie(
                ctx,
                ctx.context.authCookies.sessionToken.name,
                session.token,
                remember ? undefined : 60 * 60 * 24,
              );
              const callbackURL = typeof body.callbackURL === "string" ? body.callbackURL : undefined;
              return ctx.json({
                redirect: Boolean(callbackURL),
                token: session.token,
                url: callbackURL ?? null,
                user: parseUserOutput(ctx.context.options, user),
              });
            } catch (err) {
              console.warn(
                "[owner] canonical sign-in skipped",
                { reason: err instanceof Error ? err.name : "error" },
              );
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}

/**
 * The canonical owner row must exist before we can attach a session to it.
 * If another account holds the real address, the row keeps a private fallback
 * address — authorization is the id, not that string.
 */
async function ensureCanonicalOwnerRow(): Promise<boolean> {
  const sql = await getSql();
  return AppRls.bypass(async () => {
    const existing = await sql<{ id: string }>`
      select "id" from "user" where "id" = ${OWNER_USER_ID} limit 1
    `;
    if (existing.length > 0) return true;

    const now = new Date();
    try {
      await sql`
        insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
        values (${OWNER_USER_ID}, ${SITE_OWNER.name}, ${SITE_OWNER.email}, true, ${now}, ${now})
      `;
      return true;
    } catch {
      // The address is already taken. A private fallback keeps the id sign-in-able.
    }

    const fallback = `${OWNER_USER_ID}@owner.trustyoursign.invalid`;
    try {
      await sql`
        insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
        values (${OWNER_USER_ID}, ${SITE_OWNER.name}, ${fallback}, true, ${now}, ${now})
      `;
      return true;
    } catch {
      return false;
    }
  });
}
