import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { getMaintenanceGate } from "@/lib/maintenance";
import { isMaintenanceExemptPath } from "@/lib/maintenance-paths";

/**
 * Catches a visitor already standing on a page when the sky closes.
 * Full loads and navigations are also stopped in the root route.
 */
export function MaintenanceWatch() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (isMaintenanceExemptPath(pathname)) return;
    let cancelled = false;
    void getMaintenanceGate()
      .then((gate) => {
        if (cancelled || !gate.on || gate.bypass) return;
        void router.navigate({ to: "/maintenance", replace: true });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
