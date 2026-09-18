/**
 * Account settings mutations (change email). Password uses Better Auth's
 * `/change-password` from the client; email goes through this server fn so
 * verified Apple/email accounts can update without a verification mail gap.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export const changeAccountEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { newEmail?: string }) => {
    const newEmail = normalizeEmail(String(input?.newEmail ?? ""));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new Error("Enter a valid email address.");
    }
    return { newEmail };
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { AppRls } = await import("@/lib/db-rls.server");
    const sql = await getSql();
    const taken = await AppRls.bypass(async () => {
      const rows = await sql<{ id: string }[]>`
        select "id" from "user" where lower("email") = ${data.newEmail} and "id" <> ${context.userId} limit 1
      `;
      return rows[0] ?? null;
    });
    if (taken) throw new Error("That email is already on another account.");
    await AppRls.bypass(async () => {
      await sql`
        update "user"
        set "email" = ${data.newEmail}, "emailVerified" = false, "updatedAt" = now()
        where "id" = ${context.userId}
      `;
    });
    return { ok: true as const, email: data.newEmail };
  });
