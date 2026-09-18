import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { SessionUnavailable } from "@/lib/auth/gates";
import { resolveSessionGuardState } from "@/lib/auth/session-guard";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  acceptLegal,
  deleteAllMyData,
  deleteChart,
  listCharts,
  upsertChart,
  type SavedChart,
} from "@/lib/charts";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { daysForSign, monthsForSign } from "@/lib/chart/sun";
import type { SignId } from "@/lib/chart/types";
import { openSavedChart, useSessionStore } from "@/lib/chart/session";
import { readGuestDraft } from "@/lib/ui/guestDraft";
import { MIN_AGE } from "@/lib/legal";
import { claimSite } from "@/lib/site";
import { SITE_OWNER, isSiteOwner } from "@/lib/owner";
import { AccountMenu } from "@/components/overlay/AccountMenu";
import { authClient, signOut } from "@/lib/auth/client";
import { signInAvailability } from "@/lib/auth/email-otp";
import { platformAuthenticatorAvailable } from "@/lib/auth/passkey-sign-in";
import {
  clearLocalPasskeyCredentialIds,
  rememberLocalPasskeyCredentialIds,
} from "@/lib/auth/passkey-local";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  component: Account,
  validateSearch: (search: Record<string, unknown>): { enablePasskey?: true } => ({
    enablePasskey:
      search.enablePasskey === true ||
      search.enablePasskey === "1" ||
      search.enablePasskey === "true"
        ? true
        : undefined,
  }),
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function Account() {
  const { user, isPending, isReadFailed, refetchSession } = useCurrentUserState();
  const navigate = useNavigate();
  const { enablePasskey } = Route.useSearch();
  const guard = resolveSessionGuardState({ isPending, isReadFailed, hasUser: user !== null });
  const [charts, setCharts] = useState<SavedChart[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Right after email/OTP sign-in the first /get-session can still read as empty
  // while the cookie settles. One short grace + refetch avoids bouncing to
  // /login and stranding a freshly signed-in visitor on the form.
  const [signedOutGrace, setSignedOutGrace] = useState(true);

  const load = () => {
    listCharts()
      .then(setCharts)
      .catch(() => setCharts([]));
  };

  const userId = user?.id ?? null;
  const owner = Boolean(user && isSiteOwner(user));

  // Depend on identity, not on the object: the session hook rebuilds `user` on
  // every render, so a `[user]` dependency re-runs this effect forever
  // (fetch → setState → render → fetch) — and it would re-run `claimSite` with it.
  useEffect(() => {
    if (!userId) return;
    load();
    void acceptLegal().catch(() => undefined);
    if (owner) void claimSite().catch(() => undefined);
  }, [userId, owner]);

  useEffect(() => {
    if (guard !== "signed_out") {
      setSignedOutGrace(false);
      return;
    }
    let cancelled = false;
    setSignedOutGrace(true);
    refetchSession();
    const id = window.setTimeout(() => {
      if (!cancelled) setSignedOutGrace(false);
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // `refetchSession` is a new function each render — only re-run when guard flips.
  }, [guard]);

  if (guard === "loading" || (guard === "signed_out" && signedOutGrace)) {
    return (
      <main id="main-content" className="grid vault-page place-items-center bg-bg text-fg">
        <div className="h-8 w-32 animate-pulse rounded-md bg-bg-subtle" />
      </main>
    );
  }
  if (guard === "unavailable") return <SessionUnavailable onRetry={refetchSession} />;
  if (!user) return <Navigate to="/login" search={{ from: "account" }} />;

  const mine = charts?.filter((c) => c.relation === "self") ?? [];
  const others = charts?.filter((c) => c.relation === "other") ?? [];
  // In-tab guest draft (D2/F7) — offer to resume a birth started before sign-in.
  const draft = typeof window === "undefined" ? null : readGuestDraft();
  const exportData = async () => {
    if (!user) return;
    try {
      const rows = charts ?? (await listCharts().catch(() => [] as SavedChart[]));
      const payload = {
        exportedAt: new Date().toISOString(),
        account: user.primaryEmail,
        charts: rows,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trust-your-sign-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export");
    }
  };

  return (
    <main id="main-content" className="vault-page bg-bg px-5 py-10 text-fg">
      <div className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[var(--page-chrome-bottom)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.7rem] tracking-[0.28em] text-fg-subtle uppercase">
              {isSiteOwner(user) ? `${SITE_OWNER.role} · Account` : "Account"}
            </p>
            <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">
              {isSiteOwner(user) ? SITE_OWNER.name : (user.displayName ?? "Your vault")}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">{user.primaryEmail}</p>
          </div>
          <AccountMenu />
        </div>
        {isSiteOwner(user) ? (
          <p className="mt-3 text-sm text-fg-muted">
            You keep this house.{" "}
            <Link to="/admin" className="text-fg underline">
              Owner desk
            </Link>
            .
          </p>
        ) : null}

        <section id="profile" className="mt-8 scroll-mt-24">
          <p className="text-[0.7rem] tracking-[0.2em] text-fg-subtle uppercase">Profile</p>
          <p className="mt-2 text-sm text-fg-muted">{user.primaryEmail}</p>
        </section>

        <section id="subscription" className="mt-8 scroll-mt-24">
          <h2 className="font-display text-2xl text-fg italic">Subscription</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            {isSiteOwner(user)
              ? "You hold the house. No subscription sits on this account."
              : "The Big Three, a timed natal (Sky · Body · Bones · Ask), and one deep cut a week are free. Paid bones are not billed yet — this house is still being built."}
          </p>
        </section>

        <PasskeySection onError={setError} nudgeEnable={Boolean(enablePasskey)} />

        <AddChart
          onSaved={() => {
            setError(null);
            load();
          }}
          onError={setError}
        />

        {error ? (
          <p role="alert" className="mt-4 text-sm text-wine">
            {error}
          </p>
        ) : null}

        <section id="charts" className="mt-10 scroll-mt-24">
          <h2 className="font-display text-2xl text-fg italic">Your chart</h2>
          {charts === null ? (
            <div className="mt-3 h-16 animate-pulse rounded-md bg-bg-subtle" />
          ) : mine.length === 0 ? (
            <div className="mt-3 space-y-4">
              <p className="text-sm text-fg-muted">
                None saved yet. About two minutes to place a birth — date first, time and place if you have them.
              </p>
              {draft ? (
                <button
                  type="button"
                  onClick={() => {
                    const st = useSessionStore.getState();
                    st.openClaim(draft.signId);
                    if (draft.birth) st.setClaimBirth(draft.birth);
                    void navigate({ to: "/" });
                  }}
                  className="min-h-12 rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg"
                >
                  Resume your chart
                </button>
              ) : null}
              <Link
                to="/"
                className="inline-flex min-h-12 items-center rounded-md bg-accent px-4 text-xs tracking-[0.22em] text-accent-fg uppercase hover:bg-fg"
              >
                Place a birth
              </Link>
              <p className="text-xs leading-relaxed text-fg-subtle">
                The sky is always open for a tour —{" "}
                <Link to="/" className="text-fg underline underline-offset-4">
                  pick any sign and fly
                </Link>{" "}
                without saving. Or add one below.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {mine.map((c) => (
                <ChartRow key={c.id} chart={c} onGone={load} />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-fg italic">Other people</h2>
          <p className="mt-1 text-sm text-fg-subtle">Only with their permission.</p>
          {charts === null ? null : others.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">No one else is in this vault.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {others.map((c) => (
                <ChartRow key={c.id} chart={c} onGone={load} />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12 border-t border-border pt-6">
          <h2 className="font-display text-xl text-fg italic">Your data</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            You can erase every chart and Ask conversation we hold, and close this account. That
            cannot be undone. Afterward you can register again with the same address.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void exportData()}
              className="min-h-12 text-xs tracking-[0.18em] text-fg uppercase hover:text-accent disabled:opacity-50"
            >
              Export my data
            </button>
            <button
              type="button"
              disabled={busy}
              className="min-h-12 text-xs tracking-[0.18em] text-wine uppercase"
              onClick={async () => {
                if (
                  !window.confirm(
                    "Close this account and delete every saved chart, Ask thread, and legal record? You can register again with the same email.",
                  )
                )
                  return;
                setBusy(true);
                try {
                  await deleteAllMyData();
                  await signOut("/");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not delete");
                  setBusy(false);
                }
              }}
            >
              Delete my data
            </button>
          </div>
          <p className="mt-6 text-xs text-fg-muted">
            You must be {MIN_AGE}+.{" "}
            <Link to="/privacy" className="text-fg underline">
              Privacy
            </Link>
            {" · "}
            <Link to="/terms" className="text-fg underline">
              Terms
            </Link>
            {" · "}
            <Link to="/" className="text-fg underline">
              Back to the sky
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

type PasskeyRow = {
  id: string;
  name?: string | null;
  credentialID?: string;
  deviceType?: string;
  createdAt?: string | Date;
  backedUp?: boolean;
};

function PasskeySection({
  onError,
  nudgeEnable,
}: {
  onError: (msg: string | null) => void;
  nudgeEnable?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [rows, setRows] = useState<PasskeyRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [platformOk, setPlatformOk] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const rememberFromRows = (list: PasskeyRow[]) => {
    const ids = list
      .map((pk) => pk.credentialID)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length > 0) {
      rememberLocalPasskeyCredentialIds(ids);
    } else {
      // Account has no passkeys — drop stale local IDs so /login stays gated.
      clearLocalPasskeyCredentialIds();
    }
  };

  const load = () => {
    void (async () => {
      try {
        const { data, error } = await authClient.$fetch<PasskeyRow[]>("/passkey/list-user-passkeys", {
          method: "GET",
        });
        if (error) {
          setRows([]);
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setRows(list);
        rememberFromRows(list);
      } catch {
        setRows([]);
      }
    })();
  };

  useEffect(() => {
    let cancelled = false;
    signInAvailability()
      .then((status) => {
        if (cancelled) return;
        setEnabled(status.passkeyAvailable);
        if (status.passkeyAvailable) load();
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    void platformAuthenticatorAvailable().then((ok) => {
      if (!cancelled) setPlatformOk(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  const add = async () => {
    onError(null);
    setBusy(true);
    try {
      const label =
        typeof navigator !== "undefined" && /iPhone|iPad|Mac/.test(navigator.userAgent)
          ? "This Apple device"
          : "This device";
      const { data, error, ...rest } = await authClient.passkey.addPasskey({
        name: label,
        authenticatorAttachment: "platform",
        returnWebAuthnResponse: true,
      });
      if (error) throw new Error(error.message ?? "Could not add a passkey");
      // Better Auth returns the new passkey row (includes credentialID).
      // Also capture the WebAuthn credential id if the row shape is missing it.
      const created = data as PasskeyRow | null | undefined;
      const webauthnId = (rest as { webauthn?: { response?: { id?: string } } }).webauthn
        ?.response?.id;
      const ids = [created?.credentialID, webauthnId].filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      );
      if (ids.length > 0) rememberLocalPasskeyCredentialIds(ids);
      setNudgeDismissed(true);
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not add a passkey";
      if (!/cancel|abort|notallowed/i.test(message)) onError(message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    onError(null);
    setBusy(true);
    try {
      const { error } = await authClient.$fetch("/passkey/delete-passkey", {
        method: "POST",
        body: { id },
      });
      if (error) throw new Error(error.message ?? "Could not remove that passkey");
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not remove that passkey");
    } finally {
      setBusy(false);
    }
  };

  const showNudge =
    Boolean(nudgeEnable) &&
    !nudgeDismissed &&
    platformOk &&
    rows !== null &&
    rows.length === 0;

  return (
    <section id="passkeys" className="mt-8 scroll-mt-24">
      <h2 className="font-display text-2xl text-fg italic">Passkeys</h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        Unlock next time with Face ID or Touch ID. Passkeys sync through iCloud Keychain on your
        Apple devices — this is not Sign in with Apple.
      </p>
      {showNudge ? (
        <div className="mt-4 space-y-3 rounded-md border border-accent/40 bg-bg-elevated/80 px-4 py-4">
          <p className="text-sm leading-relaxed text-fg">
            Enable Face ID on this device so next time you can unlock without the email code — and
            without Safari’s Scan QR sheet.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void add()}
              className="min-h-12 rounded-md bg-accent px-4 text-xs tracking-[0.18em] text-accent-fg uppercase disabled:opacity-50"
            >
              Enable Face ID now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setNudgeDismissed(true)}
              className="min-h-11 text-xs tracking-[0.16em] text-fg-subtle uppercase hover:text-fg disabled:opacity-50"
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
      {rows === null ? (
        <div className="mt-3 h-12 animate-pulse rounded-md bg-bg-subtle" />
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-fg-subtle">None on this account yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-elevated/70 px-4 py-3"
            >
              <div>
                <p className="text-sm text-fg">{pk.name?.trim() || "Passkey"}</p>
                <p className="text-xs tracking-wide text-fg-subtle uppercase">
                  {pk.backedUp ? "Synced" : "This device"}
                  {pk.createdAt
                    ? ` · ${new Date(pk.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                className="min-h-11 text-xs tracking-[0.16em] text-fg-subtle uppercase hover:text-wine disabled:opacity-50"
                onClick={() => void remove(pk.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void add()}
        className="mt-4 min-h-12 rounded-md border border-border px-4 text-xs tracking-[0.18em] text-fg uppercase hover:bg-bg-elevated disabled:opacity-50"
      >
        Unlock next time with Face ID
      </button>
    </section>
  );
}

function ChartRow({ chart, onGone }: { chart: SavedChart; onGone: () => void }) {
  const navigate = useNavigate();
  const sign = CONSTELLATIONS.find((s) => s.id === chart.signId);
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-elevated/70 px-4 py-3">
      <div>
        <p className="font-display text-lg text-fg italic">{chart.label}</p>
        <p className="text-xs tracking-wide text-fg-subtle uppercase">
          {sign?.name} · {chart.birthMonth}/{chart.birthDay}/{chart.birthYear}
          {chart.birthPlace ? ` · ${chart.birthPlace}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="min-h-11 text-xs tracking-[0.16em] text-fg uppercase hover:text-accent"
          onClick={async () => {
            await openSavedChart(chart, "library");
            void navigate({ to: "/" });
          }}
        >
          Open
        </button>
        <button
          type="button"
          className="min-h-11 text-xs tracking-[0.16em] text-fg-subtle uppercase hover:text-wine"
          onClick={async () => {
            await deleteChart({ data: chart.id });
            onGone();
          }}
        >
          Remove
        </button>
      </div>
    </li>
  );
}

function AddChart({ onSaved, onError }: { onSaved: () => void; onError: (m: string) => void }) {
  const [relation, setRelation] = useState<"self" | "other">("self");
  const [personName, setPersonName] = useState("");
  const [signId, setSignId] = useState<SignId>("aries");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [consent, setConsent] = useState(false);
  const [permission, setPermission] = useState(false);
  const [busy, setBusy] = useState(false);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: y - 1925 }, (_, i) => y - i);
  }, []);
  const monthN = Number(month);
  const yearN = Number(year);
  const signMonths = monthsForSign(signId);
  const signDays = daysForSign(signId, monthN, yearN || undefined);

  return (
    <form
      className="mt-8 space-y-3 rounded-md border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await upsertChart({
            data: {
              label: relation === "self" ? "My chart" : personName.trim(),
              relation,
              personName: personName.trim(),
              signId,
              birthMonth: monthN,
              birthDay: Number(day),
              birthYear: yearN,
              consent,
              otherPermission: permission,
            },
          });
          setPersonName("");
          setConsent(false);
          setPermission(false);
          onSaved();
        } catch (err) {
          onError(err instanceof Error ? err.message : "Could not save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="font-display text-xl text-fg italic">Save a chart</p>
      <div className="flex gap-2 text-xs tracking-[0.16em] uppercase">
        <button
          type="button"
          className={cn("min-h-11", relation === "self" ? "text-fg" : "text-fg-muted")}
          onClick={() => setRelation("self")}
        >
          Mine
        </button>
        <button
          type="button"
          className={cn("min-h-11", relation === "other" ? "text-fg" : "text-fg-muted")}
          onClick={() => setRelation("other")}
        >
          Someone else
        </button>
      </div>
      {relation === "other" ? (
        <label className="block">
          <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
            Their name
          </span>
          <input
            required
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Their name"
            className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-fg"
          />
        </label>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
          Sign
        </span>
        <select
          value={signId}
          onChange={(e) => setSignId(e.target.value as SignId)}
          className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-fg"
        >
          {CONSTELLATIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
            Month
          </span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
            required
          >
            <option value="">—</option>
            {signMonths.map((m) => (
              <option key={m} value={m}>
                {MONTHS[m - 1]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
            Day
          </span>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
            required
            disabled={!monthN}
          >
            <option value="">—</option>
            {signDays.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.7rem] tracking-[0.18em] text-fg-subtle uppercase">
            Year
          </span>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-2 text-fg"
            required
          >
            <option value="">—</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex min-h-11 items-start gap-2 text-sm text-fg-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>I consent to storing this birth date on my account.</span>
      </label>
      {relation === "other" ? (
        <label className="flex min-h-11 items-start gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={permission}
            onChange={(e) => setPermission(e.target.checked)}
            className="mt-1"
          />
          <span>I have this person’s permission to keep their birth date.</span>
        </label>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-md bg-accent text-xs tracking-[0.22em] text-accent-fg uppercase disabled:opacity-50"
      >
        Save to my vault
      </button>
    </form>
  );
}
