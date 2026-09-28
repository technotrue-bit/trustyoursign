import { useEffect, useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { RedirectToSignIn, SessionUnavailable } from "@/lib/auth/gates";
import { resolveSessionGuardState } from "@/lib/auth/session-guard";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SITE_OWNER, isSiteOwner } from "@/lib/owner";
import { claimSite } from "@/lib/site";
import { PRIVACY_VERSION, TERMS_VERSION, CONTACT_HANDLE } from "@/lib/legal";
import { getAiDesk, grantSkyPass, saveAiDesk } from "@/lib/chart/sky";
import { getMaintenanceGate, setMaintenance } from "@/lib/maintenance";
import { listResearchLibrary } from "@/lib/chart/research";
import { classifyOwnerFetchError } from "@/lib/owner-state";
import { AccountMenu } from "@/components/overlay/AccountMenu";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { user, isPending, isReadFailed } = useCurrentUserState();
  const guard = resolveSessionGuardState({ isPending, isReadFailed, hasUser: user !== null });
  const [claim, setClaim] = useState<"checking" | "bound" | "unbound" | "error">("checking");

  const owner = Boolean(user && isSiteOwner(user));
  // Depend on the flag, not the object: the session hook rebuilds `user` on every
  // render, so a `[user]` dependency re-runs this effect (and `claimSite`) forever.
  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    setClaim("checking");
    claimSite()
      .then((r) => {
        if (!cancelled) setClaim(r.owner ? "bound" : "unbound");
      })
      .catch(() => {
        if (!cancelled) setClaim("error");
      });
    return () => {
      cancelled = true;
    };
  }, [owner]);
  const claimed: boolean | null = claim === "checking" ? null : claim === "bound";

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
            {SITE_OWNER.name} keeps Trust Your Sign. This sign-in is not the owner account.
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
      <div className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.7rem] tracking-[0.28em] text-accent uppercase">
              {SITE_OWNER.role}
            </p>
            <h1 className="mt-2 font-display text-4xl tracking-tight italic">{SITE_OWNER.name}</h1>
            <p className="mt-1 text-sm text-fg-muted">{CONTACT_HANDLE}</p>
          </div>
          <AccountMenu />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-fg-muted">
          This is your vault. Charts people save stay on their own accounts — you do not get a dump
          of their birth dates. That is the privacy we promised them.
        </p>
        <MaintenanceSwitch />
        <dl className="mt-8 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-fg-subtle">Site</dt>
            <dd>Trust Your Sign</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-fg-subtle">Owner</dt>
            <dd>{SITE_OWNER.name}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-fg-subtle">Handle</dt>
            <dd>{SITE_OWNER.handle}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-fg-subtle">Claim</dt>
            <dd>
              {claim === "bound"
                ? "Bound to this sign-in"
                : claim === "unbound"
                  ? "Not bound to this sign-in"
                  : claim === "error"
                    ? "Could not check this sign-in"
                    : "Checking"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-fg-subtle">Terms</dt>
            <dd>{TERMS_VERSION}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt className="text-fg-subtle">Privacy</dt>
            <dd>{PRIVACY_VERSION}</dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap gap-4 text-xs tracking-[0.18em] uppercase">
          <Link to="/admin/users">Accounts</Link>
          <Link to="/account">Your charts</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/">The sky</Link>
        </div>
        <ResearchBooks claimed={claimed} />
        <AiDeskForm />
      </div>
    </main>
  );
}

function MaintenanceSwitch() {
  const router = useRouter();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getMaintenanceGate()
      .then((gate) => setOn(gate.on))
      .catch(() => setOn(false));
  }, []);

  async function flip() {
    if (on === null || busy) return;
    const next = !on;
    setBusy(true);
    setErr(null);
    setOn(next);
    try {
      const saved = await setMaintenance({ data: { on: next } });
      setOn(saved.on);
      await router.invalidate();
    } catch {
      setOn(!next);
      setErr("Could not change that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-md border border-border bg-bg-elevated/80 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] tracking-[0.22em] text-accent uppercase">Maintenance</p>
          {on === null ? (
            <div className="mt-3 h-8 w-48 animate-pulse rounded-md bg-bg-subtle" />
          ) : (
            <h2 className="mt-2 font-display text-3xl tracking-tight text-fg italic">
              {on ? "On — the sky is closed" : "Off — the sky is open"}
            </h2>
          )}
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            When this is on, everyone but you sees a holding screen. You still walk the site,
            including this desk.
          </p>
          {err ? (
            <p role="alert" className="mt-2 text-sm text-wine">
              {err}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-pressed={on === true}
          disabled={on === null || busy}
          onClick={() => void flip()}
          className="min-h-11 rounded-md border border-border px-4 text-xs tracking-[0.18em] uppercase disabled:opacity-50"
        >
          {on === null ? "…" : on ? "Open the sky" : "Close the sky"}
        </button>
      </div>
    </section>
  );
}

type ResearchBook = { id: "saige" | "joey"; title: string; oneCut: string; date: string };

function ResearchBooks({ claimed }: { claimed: boolean | null }) {
  const [books, setBooks] = useState<ResearchBook[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    // The page can open on a name/email glance. The library itself stays behind
    // the server bind, so don't ask until that bind says yes — a no used to
    // surface as "the research desk could not be opened."
    if (claimed !== true) return;
    let cancelled = false;
    listResearchLibrary()
      .then((rows) => {
        if (!cancelled) setBooks(rows);
      })
      .catch((error) => {
        if (cancelled) return;
        const kind = classifyOwnerFetchError(error);
        if (kind === "unseeded") {
          setBooks([]);
          setErr(null);
          return;
        }
        setBooks([]);
        setErr(
          kind === "signed_out"
            ? "Your sign-in lapsed. Sign in again to open the desk."
            : kind === "not_owner"
              ? "This sign-in isn’t unlocked for the research desk."
              : "The research desk could not be opened.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [claimed]);
  const empty = claimed === true && books !== null && books.length === 0 && !err;
  return (
    <section id="research" className="mt-10 scroll-mt-24 border-t border-border pt-8">
      <h2 className="text-[0.7rem] tracking-[0.22em] text-accent uppercase">Research charts</h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        Timed nativities. Owner only. These do not appear for anyone else.
      </p>
      {err ? (
        <p role="alert" className="mt-3 text-sm text-wine">
          {err}
        </p>
      ) : null}
      <ul className="mt-5 space-y-3">
        {claimed === null || (claimed === true && books === null && !err) ? (
          <li className="h-20 animate-pulse rounded-md bg-bg-subtle" />
        ) : null}
        {books?.map((book) => (
          <li key={book.id}>
            <a
              href={`/?desk=${book.id}`}
              className="block rounded-md border border-border bg-bg-elevated/80 px-4 py-4 hover:bg-bg-subtle"
            >
              <p className="font-display text-xl tracking-tight text-fg italic">{book.title}</p>
              <p className="mt-1 text-sm text-fg-muted">{book.oneCut}</p>
              <p className="mt-1 text-xs tracking-wide text-fg-subtle uppercase">
                {book.id === "saige" ? "Premium house" : "Walkthrough"} · {book.date} · {book.id}
              </p>
            </a>
          </li>
        ))}
        {empty ? (
          <li>
            <p className="text-sm text-fg-muted">No research charts are on this desk yet.</p>
          </li>
        ) : null}
        {claimed === false ? (
          <li>
            <p className="text-sm text-fg-muted">
              This sign-in isn’t bound to the desk. Sign in with the owner password, or an email
              code sent to this address. A display name does not bind it.
            </p>
          </li>
        ) : null}
        <li>
          <div className="rounded-md border border-dashed border-border px-4 py-4">
            <p className="font-display text-xl tracking-tight text-fg italic">The third</p>
            <p className="mt-1 text-sm text-fg-muted">
              Sealed until we want to see it all come together. The natal data is not being
              rewritten.
            </p>
          </div>
        </li>
      </ul>
    </section>
  );
}

type DeskShape = {
  kill: boolean;
  lightModel: string;
  lightEffort: string;
  lightTokens: number;
  deepModel: string;
  deepEffort: string;
  deepTokens: number;
  systemVault: string;
  systemWarm: string;
};

function AiDeskForm() {
  const [desk, setDesk] = useState<DeskShape | null>(null);
  const [passId, setPassId] = useState("");
  const [passKind, setPassKind] = useState("free");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    getAiDesk()
      .then(setDesk)
      .catch(() =>
        setDesk({
          kill: false,
          lightModel: "grok-4.5",
          lightEffort: "low",
          lightTokens: 520,
          deepModel: "grok-4.6",
          deepEffort: "xhigh",
          deepTokens: 2200,
          systemVault: "",
          systemWarm: "",
        }),
      );
  }, []);
  if (!desk) {
    return <div className="mt-10 h-24 animate-pulse rounded-md bg-bg-subtle" />;
  }
  const efforts = ["low", "medium", "high", "xhigh"];
  return (
    <form
      className="mt-10 space-y-4 border-t border-border pt-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        try {
          const next = await saveAiDesk({ data: desk });
          setDesk(next);
          setMsg("Desk saved.");
        } catch (err) {
          setMsg(err instanceof Error ? err.message : "Could not save");
        }
      }}
    >
      <p className="text-[0.7rem] tracking-[0.22em] text-accent uppercase">Machine (owner only)</p>
      <p className="text-sm text-fg-muted">
        Visitors never see these names. They see a cut, or a rest.
      </p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={desk.kill}
          onChange={(e) => setDesk({ ...desk, kill: e.target.checked })}
        />
        Rest the machine
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
            Light model
          </span>
          <input
            className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
            value={desk.lightModel}
            onChange={(e) => setDesk({ ...desk, lightModel: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
            Light effort
          </span>
          <select
            className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
            value={desk.lightEffort}
            onChange={(e) => setDesk({ ...desk, lightEffort: e.target.value })}
          >
            {efforts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
            Deep model
          </span>
          <input
            className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
            value={desk.deepModel}
            onChange={(e) => setDesk({ ...desk, deepModel: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
            Deep effort
          </span>
          <select
            className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
            value={desk.deepEffort}
            onChange={(e) => setDesk({ ...desk, deepEffort: e.target.value })}
          >
            {efforts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
            Light tokens
          </span>
          <input
            type="number"
            className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
            value={desk.lightTokens}
            onChange={(e) => setDesk({ ...desk, lightTokens: Number(e.target.value) })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
            Deep tokens
          </span>
          <input
            type="number"
            className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
            value={desk.deepTokens}
            onChange={(e) => setDesk({ ...desk, deepTokens: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
          Vault system
        </span>
        <textarea
          className="min-h-32 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
          value={desk.systemVault}
          onChange={(e) => setDesk({ ...desk, systemVault: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs tracking-[0.16em] text-fg-subtle uppercase">
          Warm system
        </span>
        <textarea
          className="min-h-32 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
          value={desk.systemWarm}
          onChange={(e) => setDesk({ ...desk, systemWarm: e.target.value })}
        />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-md bg-accent px-4 text-xs tracking-[0.2em] text-accent-fg uppercase"
      >
        Save machine
      </button>
      <div className="pt-6">
        <p className="text-xs tracking-[0.16em] text-fg-subtle uppercase">Grant a pass</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="min-h-11 min-w-48 flex-1 rounded-md border border-border bg-bg-elevated px-3 text-sm"
            placeholder="user id"
            value={passId}
            onChange={(e) => setPassId(e.target.value)}
          />
          <select
            className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 text-sm"
            value={passKind}
            onChange={(e) => setPassKind(e.target.value)}
          >
            <option value="free">free</option>
            <option value="bones">bones</option>
            <option value="vault">vault</option>
          </select>
          <button
            type="button"
            className="min-h-11 rounded-md border border-border px-3 text-xs tracking-[0.16em] uppercase"
            onClick={async () => {
              setMsg(null);
              try {
                const granted = await grantSkyPass({
                  data: { userId: passId, entitlement: passKind },
                });
                setMsg(granted.ok ? "Pass granted." : granted.error);
              } catch (err) {
                setMsg(err instanceof Error ? err.message : "Could not grant");
              }
            }}
          >
            Grant
          </button>
        </div>
      </div>
      {msg ? <p className="text-sm text-fg-muted">{msg}</p> : null}
    </form>
  );
}
