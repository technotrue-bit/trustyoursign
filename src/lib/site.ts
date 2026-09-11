import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

export const bindOwnerPreview = createServerFn({ method: "POST" }).handler(async () => {
  const { bindOwnerPreviewImpl } = await import("./site.server");
  return bindOwnerPreviewImpl();
});

export const claimSite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const token = "bearerToken" in context ? (context as { bearerToken?: string }).bearerToken : undefined;
    const { claimSiteImpl } = await import("./site.server");
    return claimSiteImpl({ userId: context.userId, bearerToken: token });
  });
