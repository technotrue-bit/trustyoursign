import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { ResearchChartId } from "./types";
import type { Nativity } from "./schema";

function asChartId(id: string): ResearchChartId {
  if (id === "joey") return "joey";
  if (id === "saige") return "saige";
  throw new Error("Not found");
}

/** Owner-only. Research nativities never go to the public client bundle. */
export const listResearchLibrary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { assertResearchOwner, listResearchLibrary: list } =
      await import("./nativities/load.server");
    const { AppRls } = await import("@/lib/db-rls.server");
    await assertResearchOwner(context.userId);
    return AppRls.bypass(() => list());
  });

export const getResearchChart = createServerFn({ method: "GET" })
  .validator((id: string) => asChartId(id))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<Nativity> => {
    const { assertResearchOwner, loadResearchNativity } = await import("./nativities/load.server");
    const { AppRls } = await import("@/lib/db-rls.server");
    await assertResearchOwner(context.userId);
    return AppRls.bypass(() => loadResearchNativity(data));
  });
