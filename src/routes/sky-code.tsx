import { createFileRoute } from "@tanstack/react-router";
import { AccountMenu } from "@/components/overlay/AccountMenu";
import { SkyCodeSection } from "@/components/overlay/SkyCodeCard";
import { RequireSession } from "@/lib/auth/gates";

export const Route = createFileRoute("/sky-code")({
  component: SkyCodePage,
});

function SkyCodePage() {
  return (
    <RequireSession from="sky-code">
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
    </RequireSession>
  );
}
