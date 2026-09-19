import { useState } from "react";
import { Link } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOut } from "@/lib/auth/client";
import { clearBearerTokens } from "@/lib/auth/bearer-storage";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isSiteOwner } from "@/lib/owner";
import { cn } from "@/lib/utils";
import { AccountSettingsPanel } from "./AccountSettingsPanel";

export function AccountMenu() {
  const { user, isPending, isReadFailed, refetchSession } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"main" | "settings">("main");
  const [leaving, setLeaving] = useState(false);

  if (isPending) {
    return <div className="size-11 shrink-0 animate-pulse rounded-full bg-bg-subtle" aria-hidden />;
  }
  if (!user && isReadFailed) {
    // A failed session READ is not "signed out" (see `session-guard`). Telling a
    // signed-in visitor to sign in because one request dropped is exactly how a
    // hiccup reads as being logged out — so offer the retry instead.
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
  const owner = isSiteOwner(user);
  const initial = label.charAt(0).toUpperCase();

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPanel("main");
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
            onCloseAutoFocus={(e) => e.preventDefault()}
            className={cn(
              "z-[80] w-64 overflow-hidden rounded-xl border border-border bg-bg-elevated/96 shadow-[var(--shadow-border)] backdrop-blur-sm outline-none",
              panel === "main" && "py-1",
            )}
          >
            {panel === "settings" ? (
              <AccountSettingsPanel
                onBack={() => setPanel("main")}
                onClose={() => setOpen(false)}
              />
            ) : (
              <>
                <DropdownMenu.Label className="truncate px-4 pt-3 pb-2 text-xs tracking-[0.16em] text-fg-subtle uppercase">
                  {owner ? "Owner" : label}
                </DropdownMenu.Label>
                {owner ? (
                  <MenuLink to="/" search={{ desk: "joey" }} onPick={() => setOpen(false)}>
                    My Chart
                  </MenuLink>
                ) : (
                  <MenuLink to="/account" hash="charts" onPick={() => setOpen(false)}>
                    My Chart
                  </MenuLink>
                )}
                <MenuLink to="/account" hash="profile" onPick={() => setOpen(false)}>
                  Profile
                </MenuLink>
                <MenuLink to="/account" hash="subscription" onPick={() => setOpen(false)}>
                  Subscription
                </MenuLink>
                {owner ? (
                  <>
                    <MenuLink to="/admin" hash="research" onPick={() => setOpen(false)}>
                      Research desk
                    </MenuLink>
                    <MenuLink to="/" search={{ desk: "library" }} onPick={() => setOpen(false)}>
                      The library
                    </MenuLink>
                  </>
                ) : null}
                <DropdownMenu.Item
                  className="flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-sm text-fg outline-none hover:bg-bg-subtle focus:bg-bg-subtle"
                  onSelect={(e) => {
                    e.preventDefault();
                    setPanel("settings");
                  }}
                >
                  Settings
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  disabled={leaving}
                  className="flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-sm text-fg-muted outline-none hover:bg-bg-subtle hover:text-fg focus:bg-bg-subtle disabled:opacity-50"
                  onSelect={(e) => {
                    e.preventDefault();
                    setLeaving(true);
                    try {
                      sessionStorage.setItem("grok-auth.skip-owner-bind", "1");
                      clearBearerTokens({
                        session: sessionStorage,
                        local: localStorage,
                      });
                    } catch {
                      /* ignore */
                    }
                    void signOut("/").catch(() => setLeaving(false));
                  }}
                >
                  {leaving ? <span aria-live="polite">Leaving…</span> : "Log out"}
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </div>
    </DropdownMenu.Root>
  );
}

function MenuLink({
  to,
  hash,
  search,
  onPick,
  children,
}: {
  to: "/account" | "/admin" | "/" | "/login";
  hash?: string;
  search?: { desk?: string };
  onPick: () => void;
  children: string;
}) {
  // Client-side navigation keeps the Better Auth session atom warm. Hard <a href>
  // reloads remounted the app, re-ran OwnerBind bearer restore, and were the
  // moments Joey saw intermittent /login bounces from the account menu.
  return (
    <DropdownMenu.Item asChild>
      <Link
        to={to}
        hash={hash}
        search={search}
        onClick={onPick}
        className="flex min-h-11 cursor-pointer items-center px-4 text-sm text-fg outline-none hover:bg-bg-subtle focus:bg-bg-subtle data-[highlighted]:bg-bg-subtle"
      >
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}
