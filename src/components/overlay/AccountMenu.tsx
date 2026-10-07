import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronRight } from "lucide-react";
import { clearBearerTokens } from "@/lib/auth/bearer-storage";
import { signOut } from "@/lib/auth/client";
import { getResearchChart, listResearchLibrary } from "@/lib/chart/research";
import { isResearchChartId, type ResearchChartId } from "@/lib/chart/types";
import { accountTriggerName } from "@/lib/auth/closed-beta-badge";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { openSavedChart, useSessionStore } from "@/lib/chart/session";
import { listCharts } from "@/lib/charts";
import { pickSkyChart } from "@/lib/charts-saved";
import { skipIntro } from "@/lib/galaxy/intro";
import { useGalaxy } from "@/lib/galaxy/store";
import { skipBirth } from "@/lib/galaxy/travel";
import {
  clearChartRoomsBoot,
  showChartRoomsOnNextBoot,
} from "@/lib/ui/chartSheetIntent";
import { leaveToMainMenu } from "@/lib/ui/mainMenu";
import { savePlaceSession } from "@/lib/ui/skyPlace";
import {
  EMPTY_DESK_NOTE,
  YOUR_SKIES_LABEL,
  ownerSkyLinks,
  ownerSkyMenuMode,
} from "@/lib/owner-menu";
import {
  classifyOwnerFetchError,
  forgetOwnerVerdict,
  refreshOwnerVerdict,
  resolveOwnerVerdict,
  useOwnerVerdict,
  type OwnerFetchFailure,
} from "@/lib/owner-state";
import { cn } from "@/lib/utils";
import { AccountSettingsPanel } from "./AccountSettingsPanel";
import { ClosedBetaTesterBadge } from "./ClosedBetaBadge";

/** Row styling for a menu action: sky entries, Settings. */
const ITEM_CLASS =
  "flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-sm text-fg outline-none hover:bg-bg-subtle focus:bg-bg-subtle data-[highlighted]:bg-bg-subtle disabled:cursor-default disabled:opacity-50";

type Desk = "joey" | "saige";
type SkyTarget = Desk | "mine" | "rooms";

/** Fold the sheet and park on Sky so the planet wheel is the thing you see. */
function revealPlanetSky() {
  clearChartRoomsBoot();
  const st = useSessionStore.getState();
  if (!st.session) return false;
  st.setMode("sky");
  st.foldSheet(true);
  return true;
}

/** Open the sheet on Sky so the chart rooms are on screen, not tucked away. */
function revealChartRooms() {
  const st = useSessionStore.getState();
  if (!st.session) return false;
  st.setMode("sky");
  st.foldSheet(false);
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
  clearChartRoomsBoot();
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
  const [error, setError] = useState<{ kind: OwnerFetchFailure; retry: () => void } | null>(null);
  const [panel, setPanel] = useState<"main" | "settings" | "skies">("main");
  const [leaving, setLeaving] = useState(false);
  // null until the desk answers. Never assume Joey and Saige are both seeded.
  const [deskIds, setDeskIds] = useState<ResearchChartId[] | null>(null);
  const [deskEmpty, setDeskEmpty] = useState(false);
  const owner = useOwnerVerdict(user?.id) === true;
  const deskGen = useRef(0);
  const refreshDeskRef = useRef<() => void>(() => {});
  const skiesBackRef = useRef<HTMLButtonElement>(null);
  const skiesItemRef = useRef<HTMLDivElement>(null);

  refreshDeskRef.current = () => {
    if (!user?.id || !owner) return;
    const gen = ++deskGen.current;
    listResearchLibrary()
      .then((rows) => {
        if (gen !== deskGen.current) return;
        const links = ownerSkyLinks(rows.map((row) => row.id));
        setDeskIds(links.map((link) => link.id));
        setDeskEmpty(links.length === 0);
        setError((prev) =>
          prev?.kind === "unseeded" || prev?.kind === "unreachable" ? null : prev,
        );
      })
      .catch((err: unknown) => {
        if (gen !== deskGen.current) return;
        const kind = classifyOwnerFetchError(err);
        console.error("[account-menu] desk list failed", kind, err);
        if (kind === "unseeded") {
          setDeskIds([]);
          setDeskEmpty(true);
          setError(null);
          return;
        }
        // A lapsed cookie or a non-owner is stale chrome. An empty desk is not.
        if (kind !== "unreachable") forgetOwnerVerdict(user.id);
        if (kind === "signed_out") refetchSession();
        if (kind !== "unreachable") {
          setDeskIds([]);
          setDeskEmpty(false);
        }
        setError({ kind, retry: () => refreshDeskRef.current() });
      });
  };

  useEffect(() => {
    if (!user?.id || !owner) {
      deskGen.current += 1;
      setDeskIds(null);
      setDeskEmpty(false);
      return;
    }
    refreshDeskRef.current();
  }, [owner, user?.id]);

  useEffect(() => {
    if (!open || panel !== "skies") return;
    skiesBackRef.current?.focus();
  }, [open, panel]);

  if (isPending) {
    return <div className="size-11 shrink-0 animate-pulse rounded-full bg-bg-subtle" aria-hidden />;
  }
  if (!user && isReadFailed) {
    return (
      <button
        type="button"
        onClick={refetchSession}
        title="Couldn't check your sign-in — tap to try again"
        aria-label="Reconnect. Couldn't check your sign-in. Try again."
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
        className="auth-sign-in pointer-events-auto inline-flex min-h-11 items-center px-3 text-[0.68rem] tracking-[0.2em] uppercase"
      >
        Sign in
      </Link>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const initial = label.charAt(0).toUpperCase();
  const locked = busy !== null || leaving;
  const skyLinks = ownerSkyLinks(deskIds ?? []);
  const skyMode = ownerSkyMenuMode({
    ids: deskIds,
    deskEmpty,
    failed: error !== null,
  });

  const close = () => setOpen(false);

  const goHome = (desk: Desk | undefined) =>
    navigate({
      to: "/",
      search: (prev) => ({ ...prev, desk, sign: undefined, galaxy: undefined, star: undefined }),
      replace: true,
    });

  /**
   * A refused owner call means the cached verdict is stale: the cookie lapsed
   * (embedded/partitioned browsers drop it between reloads) or this identity
   * was never the owner. Drop the cache so the rows tell the truth, and wake
   * the session read so a lapsed cookie shows as signed out instead of a
   * sticky avatar over a dead menu.
   */
  const fail = (err: unknown, retry: () => void) => {
    const kind = classifyOwnerFetchError(err);
    console.error("[account-menu] owner call failed", kind, err);
    if (kind === "unseeded") {
      setError(null);
      refreshDeskRef.current();
      return;
    }
    if (kind !== "unreachable") forgetOwnerVerdict(user.id);
    if (kind === "signed_out") refetchSession();
    setError({ kind, retry });
  };

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
      .catch((err) => fail(err, () => openDeskSky(desk)))
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
      .catch((err) => fail(err, openVisitorSky))
      .finally(() => setBusy((b) => (b === "mine" ? null : b)));
  };

  /**
   * Chart rooms: same chart as The sky, with the side sheet open on Sky.
   * No chart to open falls through to the saved-charts list, same as The sky.
   */
  const openChartRooms = () => {
    if (locked) return;
    setBusy("rooms");
    setError(null);
    void (async () => {
      const session = useSessionStore.getState().session;
      const openDesk =
        session?.kind === "research" && isResearchChartId(session.chartKey)
          ? session.chartKey
          : null;
      if (session) {
        if (openDesk) showChartRoomsOnNextBoot(openDesk);
        else clearChartRoomsBoot();
        revealChartRooms();
        close();
        void goHome(openDesk ?? undefined);
        return;
      }
      if ((await resolveOwnerVerdict(user.id)) === true) {
        await openResearchSky("joey");
        showChartRoomsOnNextBoot("joey");
        revealChartRooms();
        close();
        void goHome("joey");
        return;
      }
      const opened = await openOwnSky();
      if (opened) revealChartRooms();
      close();
      if (opened) {
        void goHome(undefined);
      } else {
        void navigate({ to: "/account", hash: "charts" });
      }
    })()
      .catch((err) => fail(err, openChartRooms))
      .finally(() => setBusy((b) => (b === "rooms" ? null : b)));
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
    return (
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
    );
  };

  const errorRow =
    error && error.kind !== "unseeded" ? (
      <div role="alert" className="flex items-center justify-between gap-3 px-4 pt-1 pb-2">
        <p className="text-xs leading-snug text-wine">
          {error.kind === "signed_out"
            ? "Your sign-in lapsed. Sign in again to open the sky."
            : error.kind === "not_owner"
              ? "The desk isn’t unlocked for this sign-in."
              : "The sky didn’t answer. Try again."}
        </p>
        {error.kind === "signed_out" ? (
          <Link
            to="/login"
            onClick={close}
            className="shrink-0 text-[0.65rem] tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
          >
            Sign in
          </Link>
        ) : (
          <button
            type="button"
            className="shrink-0 text-[0.65rem] tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
            onClick={error.retry}
          >
            Retry
          </button>
        )}
      </div>
    ) : null;

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        // A tap outside while a sky is opening must not hide the busy row.
        if (!next && busy !== null) return;
        // The verdict was asked once at mount; the cookie behind it can lapse
        // between then and now. Re-ask on every open, keeping rows steady.
        if (next) {
          void refreshOwnerVerdict(user.id);
          if (owner) refreshDeskRef.current();
        }
        setOpen(next);
        if (!next) {
          setPanel("main");
          setError(null);
        }
      }}
    >
      <div className="pointer-events-auto relative" data-no-fly>
        <div className="flex items-center justify-end gap-1.5">
          <ClosedBetaTesterBadge role={user.role} place="hud" />
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={accountTriggerName(user.role)}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-bg-elevated/90 text-sm tracking-wide text-fg hover:border-accent"
            >
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="size-11 rounded-full object-cover"
                />
              ) : (
                initial
              )}
            </button>
          </DropdownMenu.Trigger>
        </div>
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
            ) : panel === "skies" ? (
              <div className="flex max-h-[min(70vh,28rem)] flex-col">
                <div className="flex items-center gap-2 border-b border-border px-2 py-1">
                  <button
                    ref={skiesBackRef}
                    type="button"
                    className="min-h-11 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
                    onClick={() => {
                      setPanel("main");
                      requestAnimationFrame(() => skiesItemRef.current?.focus());
                    }}
                  >
                    Back
                  </button>
                  <p className="flex-1 truncate pr-2 text-xs tracking-[0.16em] text-fg-subtle uppercase">
                    {YOUR_SKIES_LABEL}
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto py-1">
                  {skyLinks.map((link) => skyRow(link.id, link.label, () => openDeskSky(link.id)))}
                  {skyLinks.length === 0 && deskEmpty ? (
                    <p className="px-4 pt-1 pb-2 text-xs leading-snug text-fg-muted">
                      {EMPTY_DESK_NOTE}
                    </p>
                  ) : null}
                  {errorRow}
                </div>
              </div>
            ) : (
              <>
                <DropdownMenu.Label className="px-4 pt-3 pb-2">
                  <span className="block truncate text-xs tracking-[0.16em] text-fg-subtle uppercase">
                    {owner ? "Owner" : label}
                  </span>
                  <ClosedBetaTesterBadge role={user.role} place="menu" />
                </DropdownMenu.Label>
                <DropdownMenu.Item
                  className={cn(ITEM_CLASS, locked && "pointer-events-none opacity-50")}
                  disabled={locked}
                  onSelect={() => {
                    // Sky links call goHome while a chart is open and must keep it.
                    // Home alone is a no-op over natal — dismiss the desk first.
                    leaveToMainMenu();
                    savePlaceSession({ kind: "home" });
                    close();
                    void goHome(undefined);
                  }}
                >
                  Back to main menu
                </DropdownMenu.Item>
                {owner ? (
                  <>
                    {skyMode === "submenu" ? (
                      <DropdownMenu.Item
                        ref={skiesItemRef}
                        className={cn(
                          ITEM_CLASS,
                          "justify-between gap-3",
                          locked && "pointer-events-none opacity-50",
                        )}
                        disabled={locked}
                        aria-haspopup="menu"
                        onSelect={(e) => {
                          // Keep the menu open so the sky list can replace this one.
                          e.preventDefault();
                          setPanel("skies");
                        }}
                      >
                        {YOUR_SKIES_LABEL}
                        <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                      </DropdownMenu.Item>
                    ) : null}
                    {skyMode === "empty" ? (
                      <p className="px-4 pt-1 pb-2 text-xs leading-snug text-fg-muted">
                        {EMPTY_DESK_NOTE}
                      </p>
                    ) : skyMode === "checking" ? (
                      <p className="px-4 py-2 text-xs text-fg-subtle">Checking the desk…</p>
                    ) : null}
                  </>
                ) : (
                  skyRow("mine", "The sky", openVisitorSky)
                )}
                {skyRow("rooms", "Chart rooms", openChartRooms)}
                {errorRow}
                <DropdownMenu.Item asChild disabled={locked}>
                  <Link
                    to="/sky-code"
                    className={cn(
                      ITEM_CLASS,
                      "justify-between gap-3",
                      locked && "pointer-events-none opacity-50",
                    )}
                    onClick={close}
                  >
                    Your sky code
                    <span className="text-[0.6rem] tracking-[0.16em] text-fg-subtle uppercase">
                      Premium
                    </span>
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild disabled={locked}>
                  <Link
                    to="/account"
                    className={cn(ITEM_CLASS, locked && "pointer-events-none opacity-50")}
                    onClick={close}
                  >
                    Profile
                  </Link>
                </DropdownMenu.Item>
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
