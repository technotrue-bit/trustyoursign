import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { getResearchChart } from "@/lib/chart/research";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useSessionStore } from "@/lib/chart/session/store";
import { skipIntro } from "@/lib/galaxy/intro";
import { useGalaxy } from "@/lib/galaxy/store";
import { skipBirth } from "@/lib/galaxy/travel";
import { savePlaceSession } from "@/lib/ui/skyPlace";
import { isSiteOwner } from "@/lib/owner";
import { cn } from "@/lib/utils";

/** Fold the sheet and park on Sky so the planet wheel is the thing you see. */
function revealPlanetSky() {
  const st = useSessionStore.getState();
  if (!st.session) return false;
  st.setMode("sky");
  st.foldSheet(true);
  return true;
}

/**
 * Open a research natal on the planet wheel. Does not wait on `?desk=` URL sync —
 * that race left taps feeling dead on the galaxy home.
 */
async function openResearchSky(desk: "joey" | "saige") {
  const st = useSessionStore.getState();
  if (st.session?.kind === "research" && st.session.chartKey === desk) {
    revealPlanetSky();
    return;
  }
  skipIntro();
  skipBirth();
  useGalaxy.getState().markBorn();
  const nat = await getResearchChart({ data: desk });
  st.openResearch(desk, nat);
  st.setMode("sky");
  st.foldSheet(true);
  savePlaceSession({ kind: "research", id: desk });
}

export function AccountMenu() {
  const { user, isPending, isReadFailed, refetchSession } = useCurrentUserState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const owner = isSiteOwner(user);
  const initial = (user.displayName ?? user.primaryEmail ?? "A").charAt(0).toUpperCase();

  const close = () => setOpen(false);

  const openDeskSky = (desk: "joey" | "saige") => {
    if (busy) return;
    setBusy(true);
    close();
    void openResearchSky(desk)
      .then(() => {
        void navigate({
          to: "/",
          search: (prev) => ({ ...prev, desk, sign: undefined, galaxy: undefined, star: undefined }),
          replace: true,
        });
      })
      .catch(() => {
        // Fall back to desk URL so VaultApp's boot path can retry.
        void navigate({ to: "/", search: (prev) => ({ ...prev, desk }) });
      })
      .finally(() => setBusy(false));
  };

  const openVisitorSky = () => {
    close();
    if (revealPlanetSky()) {
      void navigate({
        to: "/",
        search: (prev) => ({ ...prev, desk: undefined, sign: undefined, galaxy: undefined, star: undefined }),
        replace: true,
      });
      return;
    }
    void navigate({ to: "/account", hash: "charts" });
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <div className="pointer-events-auto relative" data-no-fly>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Account"
            disabled={busy}
            className="grid size-11 place-items-center rounded-full border border-border bg-bg-elevated/90 text-sm tracking-wide text-fg hover:border-accent disabled:opacity-60"
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
            onCloseAutoFocus={(e) => e.preventDefault()}
            className={cn(
              "z-[80] w-56 overflow-hidden rounded-xl border border-border bg-bg-elevated/96 py-1 shadow-[var(--shadow-border)] backdrop-blur-sm outline-none",
            )}
          >
            <DropdownMenu.Label className="truncate px-4 pt-3 pb-2 text-xs tracking-[0.16em] text-fg-subtle uppercase">
              The sky
            </DropdownMenu.Label>
            {owner ? (
              <>
                <DropdownMenu.Item
                  disabled={busy}
                  className="flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-sm text-fg outline-none hover:bg-bg-subtle focus:bg-bg-subtle data-[highlighted]:bg-bg-subtle disabled:opacity-50"
                  onSelect={(e) => {
                    e.preventDefault();
                    openDeskSky("joey");
                  }}
                >
                  The sky
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  disabled={busy}
                  className="flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-sm text-fg outline-none hover:bg-bg-subtle focus:bg-bg-subtle data-[highlighted]:bg-bg-subtle disabled:opacity-50"
                  onSelect={(e) => {
                    e.preventDefault();
                    openDeskSky("saige");
                  }}
                >
                  Saige’s sky
                </DropdownMenu.Item>
              </>
            ) : (
              <DropdownMenu.Item
                disabled={busy}
                className="flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-sm text-fg outline-none hover:bg-bg-subtle focus:bg-bg-subtle data-[highlighted]:bg-bg-subtle disabled:opacity-50"
                onSelect={(e) => {
                  e.preventDefault();
                  openVisitorSky();
                }}
              >
                The sky
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </div>
    </DropdownMenu.Root>
  );
}
