import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AccountMenu } from "@/components/overlay/AccountMenu";
import { listRegisteredAccounts, setAccountRole, type RegisteredAccount } from "@/lib/admin/accounts";
import { type AccountRole } from "@/lib/auth/account-role";
import { RedirectToSignIn, SessionUnavailable } from "@/lib/auth/gates";
import { resolveSessionGuardState } from "@/lib/auth/session-guard";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SITE_OWNER, isSiteOwner } from "@/lib/owner";
import { claimSite } from "@/lib/site";

/** /admin/users, kept beside the desk rather than inside it. */
export const Route = createFileRoute("/admin_/users")({ component: AdminUsers });

function formatSignedUp(iso: string) {
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

function AdminUsers() {
  const { user, isPending, isReadFailed } = useCurrentUserState();
  const guard = resolveSessionGuardState({ isPending, isReadFailed, hasUser: user !== null });
  const [claimed, setClaimed] = useState<boolean | null>(null);
  const owner = Boolean(user && isSiteOwner(user));

  useEffect(() => {
    if (!owner) return;
    claimSite()
      .then((r) => setClaimed(r.owner))
      .catch(() => setClaimed(false));
  }, [owner]);

  if (guard === "loading") {
    return (
      <main id="main-content" className="grid vault-page place-items-center bg-bg text-fg">
        <div className="h-8 w-32 animate-pulse rounded-md bg-bg-subtle" />
      </main>
    );
  }
  if (guard === "unavailable") return <SessionUnavailable />;
  if (!user) return <RedirectToSignIn />;
  if (!isSiteOwner(user) && claimed !== true) {
    return (
      <main id="main-content" className="vault-page bg-bg px-5 py-16 text-fg">
        <div className="mx-auto max-w-md pt-[var(--chrome-top)]">
          <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">Closed</p>
          <h1 className="mt-2 font-display text-4xl italic">This desk is taken.</h1>
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            {SITE_OWNER.name} keeps Trust Your Sign. Sign in with the Google or X account that carries
            that name, or the handle {SITE_OWNER.handle}.
          </p>
          <Link to="/" className="mt-6 inline-flex min-h-11 text-xs tracking-[0.18em] uppercase">
            Back to the sky
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <div className="mx-auto max-w-5xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.7rem] tracking-[0.28em] text-accent uppercase">{SITE_OWNER.role}</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight italic">Accounts</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
              Everyone who has signed up, newest first. Birth dates stay on their own charts — this
              is only the account. Beta is a mark for later. It does not unlock anything yet.
            </p>
          </div>
          <AccountMenu />
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-xs tracking-[0.18em] uppercase">
          <Link to="/admin">The desk</Link>
          <Link to="/">The sky</Link>
        </div>
        <AccountTable />
      </div>
    </main>
  );
}

function AccountTable() {
  const [rows, setRows] = useState<RegisteredAccount[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    listRegisteredAccounts()
      .then(setRows)
      .catch(() => setErr("The account list could not be opened."));
  }, []);

  async function saveRole(id: string, role: AccountRole) {
    setErr(null);
    setRows((current) => current?.map((row) => (row.id === id ? { ...row, role } : row)) ?? current);
    setSavingId(id);
    try {
      const saved = await setAccountRole({ data: { userId: id, role } });
      if (!saved.ok) {
        setErr(saved.error);
        const fresh = await listRegisteredAccounts();
        setRows(fresh);
      }
    } catch {
      setErr("Could not update that account.");
      try {
        setRows(await listRegisteredAccounts());
      } catch {
        /* keep the optimistic row */
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="mt-8">
      {err ? (
        <p role="alert" className="mb-3 text-sm text-wine">
          {err}
        </p>
      ) : null}
      {rows === null ? (
        <div className="h-24 animate-pulse rounded-md bg-bg-subtle" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-fg-muted">No one has signed up yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="text-[0.65rem] tracking-[0.16em] text-fg-subtle uppercase">
                <th className="border-b border-border py-2 pr-4 font-normal">Email</th>
                <th className="border-b border-border py-2 pr-4 font-normal">Name</th>
                <th className="border-b border-border py-2 pr-4 font-normal">Verified</th>
                <th className="border-b border-border py-2 pr-4 font-normal">Signed up</th>
                <th className="border-b border-border py-2 pr-4 font-normal">Role</th>
                <th className="border-b border-border py-2 pr-4 font-normal">Last IP</th>
                <th className="border-b border-border py-2 font-normal">Last device</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="border-b border-border py-3 pr-4 break-all">{row.email}</td>
                  <td className="border-b border-border py-3 pr-4">{row.name}</td>
                  <td className="border-b border-border py-3 pr-4 text-fg-muted">
                    {row.emailVerified ? "Yes" : "No"}
                  </td>
                  <td className="border-b border-border py-3 pr-4 whitespace-nowrap text-fg-muted">
                    {formatSignedUp(row.createdAt)}
                  </td>
                  <td className="border-b border-border py-3 pr-4">
                    <select
                      aria-label={`Role for ${row.email}`}
                      className="min-h-11 rounded-md border border-border bg-bg-elevated px-2 text-sm"
                      value={row.role}
                      disabled={savingId === row.id}
                      onChange={(e) => {
                        const role: AccountRole = e.target.value === "beta" ? "beta" : "user";
                        void saveRole(row.id, role);
                      }}
                    >
                      <option value="user">User</option>
                      <option value="beta">Beta</option>
                    </select>
                  </td>
                  <td className="border-b border-border py-3 pr-4 whitespace-nowrap text-fg-muted">
                    {row.ipAddress ?? ""}
                  </td>
                  <td
                    className="max-w-[16rem] border-b border-border py-3 text-fg-muted"
                    title={row.userAgent ?? undefined}
                  >
                    <span className="line-clamp-2">{row.userAgent ?? ""}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
