import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

export { isMaintenanceExemptPath } from "./maintenance-paths";

export type MaintenanceGate = { on: boolean; bypass: boolean };

/** Preview sessions ride a bearer token. Forward it without requiring a sign-in. */
const forwardBearer = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { getBearerToken } = await import("@/lib/auth/client");
  return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
});

/** Whether the holding screen is on, and whether this session is the owner. */
export const getMaintenanceGate = createServerFn({ method: "GET" })
  .middleware([forwardBearer])
  .handler(async ({ context }): Promise<MaintenanceGate> => {
    const token =
      context && typeof context === "object" && "bearerToken" in context
        ? (context as { bearerToken?: string }).bearerToken
        : undefined;
    const { maintenanceGate } = await import("./maintenance.server");
    return maintenanceGate(token);
  });

/** Owner-only. Flips the holding screen for everyone else. */
export const setMaintenance = createServerFn({ method: "POST" })
  .validator((input: { on: boolean }) => ({ on: Boolean(input?.on) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { assertOwner } = await import("@/lib/chart/desk.server");
    await assertOwner(context.userId);
    const { writeMaintenance } = await import("./maintenance.server");
    await writeMaintenance(data.on);
    return { on: data.on };
  });
