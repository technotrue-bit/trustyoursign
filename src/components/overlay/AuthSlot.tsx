import { lazy, Suspense } from "react";

// AccountMenu pulls in the dropdown, settings panel, and chart/session code a
// guest never needs (a large chunk of it is dead until a signed-in viewer
// opens the menu). Code-split it so its bytes don't compete with first paint —
// the fallback below is the exact pulse AccountMenu itself renders while the
// session is pending, so there is nothing to see swap in.
const AccountMenu = lazy(() =>
  import("./AccountMenu").then((mod) => ({ default: mod.AccountMenu })),
);

const PENDING_FALLBACK = (
  <div className="size-11 shrink-0 animate-pulse rounded-full bg-bg-subtle" aria-hidden />
);

export function AuthSlot() {
  return (
    <Suspense fallback={PENDING_FALLBACK}>
      <AccountMenu />
    </Suspense>
  );
}
