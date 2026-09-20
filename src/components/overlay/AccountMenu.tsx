import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { clearBearerTokens } from "@/lib/auth/bearer-storage";
import { signOut } from "@/lib/auth/client";
import { getResearchChart } from "@/lib/chart/research";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { openSavedChart, useSessionStore } from "@/lib/chart/session";
import { listCharts, type SavedChart } from "@/lib/charts";
import { skipIntro } from "@/lib/galaxy/intro";
import { useGalaxy } from "@/lib/galaxy/store";
import { skipBirth } from "@/lib/galaxy/travel";
import { savePlaceSession } from "@/lib/ui/skyPlace";
import { forgetOwnerVerdict, resolveOwnerVerdict, useOwnerVerdict } from "@/lib/owner-state";
import { cn } from "@/lib/utils";
import { AccountSettingsPanel } from "./AccountSettingsPanel";

/** Row styling for a menu action: sky entries, Settings. */
const ITEM_CLASS =
  "flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-sm text-fg outline-none hover:bg-bg-subtle focus:bg-bg-subtle data-[highlighted]:bg-bg-subtle disabled:cursor-default disabled:opacity-50";

type Desk = "joey" | "saige";
type SkyTarget = Desk | "mine";

/** Fold the sheet and park on Sky so the planet wheel is the thing you see. */
function revealPlanetSky() {
  const st = useSessionStore.getState();
  if (!st.session) return false;
  st.setMode("sky");
  st.foldSheet(true);
  return true;
}

function leaveTitleScreen() {
  skipIntro();
  skipBirth();
  useGalaxy.getState().markBorn();
}

/**
 * Open a research natal on the planet wheel. Does not wait on `?desk=` URL sync —
 * that race left taps feeling dead on the galaxy home.
 */
async function openResearchSky(desk: Desk) {
  const st = useSessionStore.getState();
  if (st.session?.kind === "research" && st.session.chartKey === desk) {
    revealPlanetSky();
    return;
  }
  leaveTitleScreen();
  const nat = await getResearchChart({ data: desk });
  st.openResearch(desk, nat);
  st.setMode("sky");
  st.foldSheet(true);
  savePlaceSession({ kind: "research", id: desk });
}

/** The chart "The sky" should open when nothing is open yet: yours, else the newest. */
export function pickSkyChart(charts: readonly SavedChart[]): SavedChart | null {
  if (charts.length === 0) return null;
  return charts.find((c) => c.relation === "self") ?? charts[0]!;
}

/**
 * Visitor "The sky": land on the planet wheel without a detour through
 * /account. Returns false only when there is no chart to open.
 */
async function openOwnSky(): Promise<boolean> {
  if (revealPlanetSky()) return true;
  const chart = pickSkyChart(await listCharts());
  if (!chart) return false;
  leaveTitleScreen();
  await openSavedChart(chart, "galaxy");
  revealPlanetSky();
  return true;
}

export function AccountMenu() {
  const { user, isPending, isReadFailed, refetchSession } = useCurrentUserState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<SkyTarget | null>(null);
  const [error, setError] = useState<{ target: SkyTarget; message: string } | null>(null);
  const [panel, setPanel] = useState<"main" | "settings">("main");
  const [leaving, setLeaving] = useState(false);
  const owner = useOwnerVerdict(user?.id) === true;

  if (isPending) {
    return <div className="size-11 shrink-0 animate-pulse rounded-full bg-bg-subtle" aria-hidden />;
  }
  if (!user && isReadFailed) {
    return (
      <button
        type="button"
        onClick={refetchSession}
        title="Couldn't check your sign-in — tap to try again"
        className="auth-sign-in pointer-events-auto inline-flex min-h-11 items-center px-3 text-[0.65rem] tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
      >
        Reconnect
      </button>
    );
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="auth-sign-in pointer-events-auto inline-flex min-h-11 items-center px-3 text-[0.65rem] tracking-[0.2em] text-fg-muted uppercase hover:text-fg"
      >
        Sign in
      </Link>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const initial = label.charAt(0).toUpperCase();
  const locked = busy !== null || leaving;

  const close = () => setOpen(false);

  const goHome = (desk: Desk | undefined) =>
    navigate({
      to: "/",
      search: (prev) => ({ ...prev, desk, sign: undefined, galaxy: undefined, star: undefined }),
      replace: true,
    });

  const openDeskSky = (desk: Desk) => {
    if (locked) return;
    setBusy(desk);
    setError(null);
    void openResearchSky(desk)
      .then(() => {
        close();
        // Only after the store holds the chart — a `?desk=` fallback used to
        // retry the same failing fetch and pin the URL with nothing to show.
        void goHome(desk);
      })
      .catch((err) => {
        console.error("[account-menu] openResearchSky failed", err);
        setError({ target: desk, message: "The desk isn’t unlocked for this sign-in." });
      })
      .finally(() => setBusy(null));
  };

  const openVisitorSky = () => {
    if (locked) return;
    setBusy("mine");
    setError(null);
    void (async () => {
      // The server verdict can still be settling on first paint; an owner who
      // taps early should land on the desk, not on an empty vault.
      if ((await resolveOwnerVerdict(user.id)) === true) {
        setBusy(null);
        openDeskSky("joey");
        return;
      }
      const opened = await openOwnSky();
      close();
      if (opened) {
        void goHome(undefined);
      } else {
        void navigate({ to: "/account", hash: "charts" });
      }
    })()
      .catch((err) => {
        console.error("[account-menu] openOwnSky failed", err);
        setError({ target: "mine", message: "Your sky couldn’t open. Try again." });
      })
      .finally(() => setBusy((b) => (b === "mine" ? null : b)));
  };

  const leave = () => {
    setLeaving(true);
    try {
      // Without this flag OwnerBind re-binds the preview owner on the next load,
      // which reads as "Log out did nothing". Purge the preview bearer too so a
      // stale token cannot shadow the cleared session.
      sessionStorage.setItem("grok-auth.skip-owner-bind", "1");
      clearBearerTokens({ session: sessionStorage, local: localStorage });
    } catch {
      /* ignore */
    }
    forgetOwnerVerdict(user.id);
    void signOut("/").catch(() => setLeaving(false));
  };

  const skyRow = (target: SkyTarget, text: string, onClick: () => void) => {
    const isBusy = busy === target;
    const failed = error?.target === target;
    return (
      <>
        <DropdownMenu.Item asChild disabled={locked} onSelect={(e) => e.preventDefault()}>
          <button
            type="button"
            className={ITEM_CLASS}
            disabled={locked}
            aria-busy={isBusy || undefined}
            onClick={onClick}
          >
            {isBusy ? <span aria-live="polite">Opening…</span> : text}
          </button>
        </DropdownMenu.Item>
        {failed ? (
          <div role="alert" className="flex items-center justify-between gap-3 px-4 pt-1 pb-2">
            <p className="text-xs leading-snug text-wine">{error.message}</p>
            <button
              type="button"
              className="shrink-0 text-[0.65rem] tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
              onClick={onClick}
            >
              Retry
            </button>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        // A tap outside while a sky is opening must not hide the busy row.
        if (!next && busy !== null) return;
        setOpen(next);
        if (!next) {
          setPanel("main");
          setError(null);
        }
      }}
    >
      <div className="pointer-events-auto relative" data-no-fly>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Account"
            className="grid size-11 place-items-center rounded-full border border-border bg-bg-elevated/90 text-sm tracking-wide text-fg hover:border-accent"
          >
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="size-11 rounded-full object-cover" />
            ) : (
              initial
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align="end"
            sideOffset={6}
            collisionPadding={12}
            data-no-fly
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "z-[80] w-64 overflow-hidden rounded-xl border border-border bg-bg-elevated/96 shadow-[var(--shadow-border)] backdrop-blur-sm outline-none",
              panel === "main" && "py-1",
            )}
          >
            {panel === "settings" ? (
              <AccountSettingsPanel onBack={() => setPanel("main")} onClose={close} />
            ) : (
              <>
                <DropdownMenu.Label className="truncate px-4 pt-3 pb-2 text-xs tracking-[0.16em] text-fg-subtle uppercase">
                  {owner ? "Owner" : label}
                </DropdownMenu.Label>
                {owner ? (
                  <>
                    {skyRow("joey", "The sky", () => openDeskSky("joey"))}
                    {skyRow("saige", "Saige’s sky", () => openDeskSky("saige"))}
                  </>
                ) : (
                  skyRow("mine", "The sky", openVisitorSky)
                )}
                <DropdownMenu.Item
                  className={cn(ITEM_CLASS, locked && "pointer-events-none opacity-50")}
                  disabled={locked}
                  onSelect={(e) => {
                    // Keep the menu open so the settings panel can replace the list.
                    e.preventDefault();
                    setPanel("settings");
                  }}
                >
                  Settings
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild disabled={locked}>
                  <button
                    type="button"
                    disabled={locked}
                    className="flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-sm text-fg-muted outline-none hover:bg-bg-subtle hover:text-fg focus:bg-bg-subtle data-[highlighted]:bg-bg-subtle disabled:cursor-default disabled:opacity-50"
                    onClick={leave}
                  >
                    {leaving ? <span aria-live="polite">Leaving…</span> : "Log out"}
                  </button>
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </div>
    </DropdownMenu.Root>
  );
}
