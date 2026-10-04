import { useEffect, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { AccountMenu } from "@/components/overlay/AccountMenu";
import { SkyCodeSection } from "@/components/overlay/SkyCodeCard";
import { SessionUnavailable } from "@/lib/auth/gates";
import { resolveSessionGuardState } from "@/lib/auth/session-guard";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/sky-code")({
  component: SkyCodePage,
});

function SkyCodePage() {
  const { user, isPending, isReadFailed, refetchSession } = useCurrentUserState();
  const guard = resolveSessionGuardState({ isPending, isReadFailed, hasUser: user !== null });
  const [signedOutGrace, setSignedOutGrace] = useState(true);

  useEffect(() => {
    if (guard !== "signed_out") {
      setSignedOutGrace(false);
      return;
    }
    let cancelled = false;
    setSignedOutGrace(true);
    refetchSession();
    const id = window.setTimeout(() => {
      if (!cancelled) setSignedOutGrace(false);
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // `refetchSession` is a new function each render — only re-run when guard flips.
  }, [guard]);

  if (guard === "loading" || (guard === "signed_out" && signedOutGrace)) {
    return (
      <main id="main-content" className="grid vault-page place-items-center bg-bg text-fg">
        <div className="h-8 w-32 animate-pulse rounded-md bg-bg-subtle" />
      </main>
    );
  }
  if (guard === "unavailable") return <SessionUnavailable />;
  if (!user) return <Navigate to="/login" search={{ from: "sky-code" }} />;

  return (
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <div className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SkyCodeSection />
          </div>
          <AccountMenu />
        </div>
      </div>
    </main>
  );
}
