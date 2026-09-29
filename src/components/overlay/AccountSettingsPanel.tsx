import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { authClient, signOut } from "@/lib/auth/client";
import { changeAccountEmail } from "@/lib/auth/account-settings";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { deleteAllMyData } from "@/lib/charts";
import { listRegisteredAccounts, type RegisteredAccount } from "@/lib/admin/accounts";
import { isSiteOwner } from "@/lib/owner";
import { classifyOwnerFetchError, useOwnerVerdict } from "@/lib/owner-state";
import { useAskMachinePref } from "@/lib/ui/askMachinePref";
import { cn } from "@/lib/utils";

type SettingsView = "menu" | "email" | "password" | "admin" | "users";

type AccountSettingsPanelProps = {
  onBack: () => void;
  onClose: () => void;
};

export function AccountSettingsPanel({ onBack, onClose }: AccountSettingsPanelProps) {
  const { user, refetchSession } = useCurrentUserState();
  const remoteEnabled = useAskMachinePref((s) => s.remoteEnabled);
  const setRemoteEnabled = useAskMachinePref((s) => s.setRemoteEnabled);
  const hydrate = useAskMachinePref((s) => s.hydrate);
  const [view, setView] = useState<SettingsView>("menu");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCredential, setHasCredential] = useState<boolean | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await authClient.listAccounts();
        if (cancelled) return;
        const rows = (Array.isArray(data) ? data : []) as { providerId?: string }[];
        setHasCredential(rows.some((a) => a.providerId === "credential"));
      } catch {
        if (!cancelled) setHasCredential(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const owner = user ? isSiteOwner(user) : false;
  // Same people who already see owner chrome: the account-page check, or the
  // server verdict behind the Owner menu (Your Sky’s). Visitors see neither.
  const showAdmin = owner || useOwnerVerdict(user?.id) === true;

  if (view === "email") {
    return (
      <EmailForm
        currentEmail={user?.primaryEmail ?? ""}
        busy={busy}
        setBusy={setBusy}
        error={error}
        setError={setError}
        onBack={() => {
          setError(null);
          setMessage(null);
          setView("menu");
        }}
        onDone={async (email) => {
          setMessage(`Email updated to ${email}.`);
          setView("menu");
          refetchSession();
        }}
      />
    );
  }

  if (view === "password") {
    return (
      <PasswordForm
        hasCredential={hasCredential}
        busy={busy}
        setBusy={setBusy}
        error={error}
        setError={setError}
        onBack={() => {
          setError(null);
          setMessage(null);
          setView("menu");
        }}
        onDone={() => {
          setMessage("Password updated.");
          setView("menu");
        }}
      />
    );
  }

  if (view === "users" && showAdmin) {
    return (
      <div className="flex max-h-[min(70vh,28rem)] flex-col">
        <div className="flex items-center gap-2 border-b border-border px-2 py-1">
          <button
            type="button"
            className="min-h-11 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
            onClick={() => setView("admin")}
          >
            Back
          </button>
          <p className="flex-1 truncate pr-2 text-xs tracking-[0.16em] text-fg-subtle uppercase">
            All Users
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <AllUsersList />
        </div>
      </div>
    );
  }

  if (view === "admin" && showAdmin) {
    return (
      <div className="flex max-h-[min(70vh,28rem)] flex-col">
        <div className="flex items-center gap-2 border-b border-border px-2 py-1">
          <button
            type="button"
            className="min-h-11 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
            onClick={() => {
              setError(null);
              setMessage(null);
              setView("menu");
            }}
          >
            Back
          </button>
          <p className="flex-1 truncate pr-2 text-xs tracking-[0.16em] text-fg-subtle uppercase">
            Admin Page
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <p className="text-sm text-fg">Natal machine (remote)</p>
              <p className="text-[0.65rem] leading-snug text-fg-subtle">
                When off, Ask answers from the chart bones only — no remote model call.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={remoteEnabled}
              aria-label="Natal machine remote answers"
              onClick={() => setRemoteEnabled(!remoteEnabled)}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
                remoteEnabled ? "border-accent bg-accent/30" : "border-border bg-bg-subtle",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 size-5 rounded-full bg-fg transition-transform",
                  remoteEnabled && "translate-x-5",
                )}
              />
            </button>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-11 w-full items-center px-4 text-left text-sm text-fg hover:bg-bg-subtle"
            onClick={() => setView("users")}
          >
            All Users
          </button>
          <Link
            to="/admin"
            role="menuitem"
            className="flex min-h-11 w-full items-center px-4 text-left text-sm text-fg hover:bg-bg-subtle"
            onClick={onClose}
          >
            Owner desk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[min(70vh,28rem)] flex-col">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1">
        <button
          type="button"
          className="min-h-11 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
          onClick={onBack}
        >
          Back
        </button>
        <p className="flex-1 truncate pr-2 text-xs tracking-[0.16em] text-fg-subtle uppercase">Settings</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {message ? (
          <p className="px-4 py-2 text-xs text-fg-muted" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="px-4 py-2 text-xs text-wine" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          role="menuitem"
          className="flex min-h-11 w-full items-center px-4 text-left text-sm text-fg hover:bg-bg-subtle"
          onClick={() => {
            setError(null);
            setMessage(null);
            setView("email");
          }}
        >
          Change email
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex min-h-11 w-full items-center px-4 text-left text-sm text-fg hover:bg-bg-subtle"
          onClick={() => {
            setError(null);
            setMessage(null);
            setView("password");
          }}
        >
          Change password
        </button>

        {showAdmin ? (
          <button
            type="button"
            role="menuitem"
            className="flex min-h-11 w-full items-center px-4 text-left text-sm text-fg hover:bg-bg-subtle"
            onClick={() => {
              setError(null);
              setMessage(null);
              setView("admin");
            }}
          >
            Admin Page
          </button>
        ) : null}

        <button
          type="button"
          role="menuitem"
          disabled={busy || owner}
          title={owner ? "The owner account cannot be closed from this control." : undefined}
          className="flex min-h-11 w-full items-center px-4 text-left text-sm text-wine hover:bg-bg-subtle disabled:opacity-50"
          onClick={() => {
            if (owner) return;
            if (
              !window.confirm(
                "Close this account and delete every saved chart, Ask thread, and legal record? You can register again with the same email.",
              )
            ) {
              return;
            }
            setBusy(true);
            setError(null);
            void deleteAllMyData()
              .then(async () => {
                onClose();
                await signOut("/");
              })
              .catch((e) => {
                setError(e instanceof Error ? e.message : "Could not delete");
                setBusy(false);
              });
          }}
        >
          {busy ? "Deleting…" : "Delete my data"}
        </button>

        <p className="px-4 pt-2 pb-3 text-[0.6rem] leading-snug text-fg-subtle">
          More on{" "}
          <Link to="/account" hash="settings" className="text-fg underline" onClick={onClose}>
            Account
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function EmailForm({
  currentEmail,
  busy,
  setBusy,
  error,
  setError,
  onBack,
  onDone,
}: {
  currentEmail: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
  onBack: () => void;
  onDone: (email: string) => void | Promise<void>;
}) {
  const [email, setEmail] = useState(currentEmail);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await changeAccountEmail({ data: { newEmail: email } });
      await onDone(result.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col" onSubmit={(e) => void onSubmit(e)}>
      <div className="flex items-center gap-2 border-b border-border px-2 py-1">
        <button
          type="button"
          className="min-h-11 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
          onClick={onBack}
        >
          Back
        </button>
        <p className="flex-1 text-xs tracking-[0.16em] text-fg-subtle uppercase">Change email</p>
      </div>
      <div className="space-y-3 px-4 py-3">
        <label className="block text-xs tracking-[0.14em] text-fg-subtle uppercase">
          New email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case tracking-normal text-fg outline-none focus:border-accent"
          />
        </label>
        {error ? (
          <p className="text-xs text-wine" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-md border border-border text-xs tracking-[0.18em] text-fg uppercase hover:border-accent disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save email"}
        </button>
      </div>
    </form>
  );
}

function PasswordForm({
  hasCredential,
  busy,
  setBusy,
  error,
  setError,
  onBack,
  onDone,
}: {
  hasCredential: boolean | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if (err) {
        const msg = err.message ?? "Could not change password";
        if (/credential|password/i.test(msg) && hasCredential === false) {
          setError("This account signs in without a password. Use the provider (Apple, Google, …) or reset from Sign in.");
        } else {
          setError(msg);
        }
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col" onSubmit={(e) => void onSubmit(e)}>
      <div className="flex items-center gap-2 border-b border-border px-2 py-1">
        <button
          type="button"
          className="min-h-11 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
          onClick={onBack}
        >
          Back
        </button>
        <p className="flex-1 text-xs tracking-[0.16em] text-fg-subtle uppercase">Change password</p>
      </div>
      <div className="space-y-3 px-4 py-3">
        {hasCredential === false ? (
          <p className="text-xs leading-relaxed text-fg-muted">
            This account has no password on file (Apple / Google / passkey). Sign-in stays with that
            provider. You can still try{" "}
            <Link to="/login" className="text-fg underline">
              forgot password
            </Link>{" "}
            if you later add email sign-in.
          </p>
        ) : null}
        <label className="block text-xs tracking-[0.14em] text-fg-subtle uppercase">
          Current password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case tracking-normal text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="block text-xs tracking-[0.14em] text-fg-subtle uppercase">
          New password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case tracking-normal text-fg outline-none focus:border-accent"
          />
        </label>
        {error ? (
          <p className="text-xs text-wine" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-md border border-border text-xs tracking-[0.18em] text-fg uppercase hover:border-accent disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save password"}
        </button>
      </div>
    </form>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function accountMarks(row: RegisteredAccount): string {
  const marks: string[] = [];
  if (row.role === "beta") marks.push("Beta");
  if (!row.emailVerified) marks.push("Not verified");
  return marks.join(" · ");
}

/** Owner-only signup list. Mounted only from the Admin Page sheet. */
function AllUsersList() {
  const [rows, setRows] = useState<RegisteredAccount[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listRegisteredAccounts()
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const kind = classifyOwnerFetchError(error);
        setErr(
          kind === "not_owner" || kind === "signed_out"
            ? "This sign-in isn’t unlocked for the account list."
            : "The account list could not be opened.",
        );
        setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <p role="alert" className="px-4 py-3 text-xs leading-snug text-wine">
        {err}
      </p>
    );
  }
  if (rows === null) {
    return <div className="mx-4 my-3 h-16 animate-pulse rounded-md bg-bg-subtle" />;
  }
  if (rows.length === 0) {
    return <p className="px-4 py-3 text-xs leading-snug text-fg-muted">No one has signed up yet.</p>;
  }

  return (
    <div>
      <p className="px-4 pt-2 pb-1 text-[0.65rem] tracking-[0.14em] text-fg-subtle uppercase">
        {rows.length} signed up
      </p>
      <ul>
        {rows.map((row) => {
          const name = row.name.trim();
          const showName = name.length > 0 && name.toLowerCase() !== row.email.toLowerCase();
          const marks = accountMarks(row);
          return (
            <li key={row.id} className="border-b border-border px-4 py-2.5 last:border-b-0">
              <p className="break-all text-sm text-fg">{row.email}</p>
              {showName ? <p className="text-xs text-fg-muted">{name}</p> : null}
              <p className="mt-0.5 text-[0.65rem] leading-snug text-fg-subtle">
                Joined {formatWhen(row.createdAt)}
              </p>
              {row.lastSignedInAt ? (
                <p className="text-[0.65rem] leading-snug text-fg-subtle">
                  Last sign-in {formatWhen(row.lastSignedInAt)}
                </p>
              ) : null}
              {marks ? <p className="text-[0.65rem] leading-snug text-fg-subtle">{marks}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
