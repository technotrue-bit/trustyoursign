import { useEffect } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { isSiteOwner } from "@/lib/owner";
import { claimSite } from "@/lib/site";
import { getMaintenanceGate } from "@/lib/maintenance";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { noindexHead } from "@/lib/seo";

export const Route = createFileRoute("/maintenance")({
  head: noindexHead,
  beforeLoad: async () => {
    const gate = await getMaintenanceGate();
    if (!gate.on || gate.bypass) throw redirect({ to: "/" });
  },
  component: Maintenance,
});

function Maintenance() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const owner = Boolean(user && isSiteOwner(user));
  const userId = user?.id ?? null;

  useEffect(() => {
    if (isPending) return;
    if (owner) {
      void navigate({ to: "/" });
      return;
    }
    if (!userId) return;
    void claimSite()
      .then((result) => {
        if (result.owner) void navigate({ to: "/" });
      })
      .catch(() => {});
  }, [isPending, navigate, owner, userId]);

  return <MaintenanceScreen />;
}
