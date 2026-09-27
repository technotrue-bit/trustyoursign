import { createServerFn } from "@tanstack/react-start";
import { isAccountRole, type AccountRole } from "@/lib/auth/account-role";
import { authMiddleware } from "@/lib/auth/middleware";

export type RegisteredAccount = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  role: AccountRole;
  ipAddress: string | null;
  userAgent: string | null;
};

/** Owner-only. Every account, newest signup first. No charts, no birth data. */
export const listRegisteredAccounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RegisteredAccount[]> => {
    const { assertOwner } = await import("@/lib/chart/desk.server");
    await assertOwner(context.userId);
    const { listRegisteredAccounts: list } = await import("./accounts.server");
    return list();
  });

/** Owner-only. Sets the account cohort to user or beta. */
export const setAccountRole = createServerFn({ method: "POST" })
  .validator((input: { userId: string; role: string }) => {
    const userId = typeof input?.userId === "string" ? input.userId.trim().slice(0, 80) : "";
    if (!userId || !isAccountRole(input?.role)) throw new Error("Not found");
    return { userId, role: input.role };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { assertOwner } = await import("@/lib/chart/desk.server");
    await assertOwner(context.userId);
    const { setRegisteredAccountRole } = await import("./accounts.server");
    return setRegisteredAccountRole(data.userId, data.role);
  });
