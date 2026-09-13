import { useEffect, useRef, useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isSiteOwner } from "@/lib/owner";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { user, isPending, isReadFailed, refetchSession } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menuRef = useDialogFocus<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
      <a
        href="/login"
        className="auth-sign-in pointer-events-auto inline-flex min-h-11 items-center px-3 text-[0.65rem] tracking-[0.2em] text-fg-muted uppercase hover:text-fg"
      >
        Sign in
      </a>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const owner = isSiteOwner(user);
  const initial = label.charAt(0).toUpperCase();

  return (
    <div ref={box} className="pointer-events-auto relative" data-no-fly>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-full border border-border bg-bg-elevated/90 text-sm tracking-wide text-fg hover:border-accent"
      >
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="size-11 rounded-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          className={cn(
            "absolute top-[calc(100%+0.4rem)] right-0 z-[80] w-56 overflow-hidden rounded-xl border border-border bg-bg-elevated/96 py-1 shadow-[var(--shadow-border)] backdrop-blur-sm outline-none",
          )}
        >
          <p className="truncate px-4 pt-3 pb-2 text-xs tracking-[0.16em] text-fg-subtle uppercase">
            {owner ? "Owner" : label}
          </p>
          <MenuLink to={owner ? "/?desk=joey" : "/account#charts"} onPick={() => setOpen(false)}>
            My Chart
          </MenuLink>
          <MenuLink to="/account#profile" onPick={() => setOpen(false)}>
            Profile
          </MenuLink>
          <MenuLink to="/account#subscription" onPick={() => setOpen(false)}>
            Manage subscription
          </MenuLink>
          {owner ? (
            <>
              <MenuLink to="/admin#research" onPick={() => setOpen(false)}>
                Research desk
              </MenuLink>
              <MenuLink to="/?desk=library" onPick={() => setOpen(false)}>
                The library
              </MenuLink>
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            disabled={leaving}
            className="flex min-h-11 w-full items-center px-4 text-left text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-50"
            onClick={() => {
              setLeaving(true);
              try {
                sessionStorage.setItem("grok-auth.skip-owner-bind", "1");
                sessionStorage.removeItem("grok-auth.bearer-token");
                localStorage.removeItem("grok-auth.bearer-token");
              } catch {
                /* ignore */
              }
              void signOut("/").catch(() => setLeaving(false));
            }}
          >
            {leaving ? <span aria-live="polite">Leaving…</span> : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  to,
  onPick,
  children,
}: {
  to: string;
  onPick: () => void;
  children: string;
}) {
  return (
    <a
      href={to}
      role="menuitem"
      onClick={onPick}
      className="flex min-h-11 items-center px-4 text-sm text-fg hover:bg-bg-subtle"
    >
      {children}
    </a>
  );
}
