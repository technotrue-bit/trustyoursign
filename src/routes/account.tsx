import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { acceptLegal, deleteAllMyData, deleteChart, listCharts, saveChart, type SavedChart } from "@/lib/charts";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { daysForSign, monthsForSign } from "@/lib/chart/sun";
import type { SignId } from "@/lib/chart/types";
import { MIN_AGE } from "@/lib/legal";
import { claimSite } from "@/lib/site";
import { SITE_OWNER, isSiteOwner } from "@/lib/owner";
import { AccountMenu } from "@/components/overlay/AccountMenu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({ component: Account });

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
  const { user, isPending } = useCurrentUserState();
  const [charts, setCharts] = useState<SavedChart[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    listCharts()
      .then(setCharts)
      .catch(() => setCharts([]));
  };

  useEffect(() => {
    if (!user) return;
    load();
    void acceptLegal().catch(() => undefined);
    if (isSiteOwner(user)) void claimSite().catch(() => undefined);
  }, [user]);

  if (isPending) {
    return (
      <main className="grid vault-page place-items-center bg-bg text-fg">
        <div className="h-8 w-32 animate-pulse rounded-md bg-bg-subtle" />
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const mine = charts?.filter((c) => c.relation === "self") ?? [];
  const others = charts?.filter((c) => c.relation === "other") ?? [];

  return (
    <main className="vault-page bg-bg px-5 py-10 text-fg">
      <div className="mx-auto max-w-2xl pt-[var(--chrome-top)] pb-[max(2rem,var(--chrome-bottom))]">
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
              : "The Big Three and one deep cut a week are free. Paid bones are not billed yet — this house is still being built. When billing opens, it will live here."}
          </p>
        </section>

        <AddChart
          onSaved={() => {
            setError(null);
            load();
          }}
          onError={setError}
        />

        {error ? <p className="mt-4 text-sm text-wine">{error}</p> : null}

        <section id="charts" className="mt-10 scroll-mt-24">
          <h2 className="font-display text-2xl text-fg italic">Your chart</h2>
          {charts === null ? (
            <div className="mt-3 h-16 animate-pulse rounded-md bg-bg-subtle" />
          ) : mine.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">None saved yet. Lock a sign in the sky, or add one below.</p>
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
            You can erase every chart and Ask conversation we hold for this account. That cannot be undone. Session
            cookies are only for staying signed in.
          </p>
          <button
            type="button"
            disabled={busy}
            className="mt-4 min-h-12 text-xs tracking-[0.18em] text-wine uppercase"
            onClick={async () => {
              if (!window.confirm("Delete every saved chart, Ask thread, and legal record on this account?")) return;
              setBusy(true);
              try {
                await deleteAllMyData();
                load();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not delete");
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete my data
          </button>
          <p className="mt-6 text-xs text-fg-subtle">
            You must be {MIN_AGE}+.{" "}
            <Link to="/privacy" className="underline">
              Privacy
            </Link>
            {" · "}
            <Link to="/terms" className="underline">
              Terms
            </Link>
            {" · "}
            <Link to="/" className="underline">
              Back to the sky
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

function ChartRow({ chart, onGone }: { chart: SavedChart; onGone: () => void }) {
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
          await saveChart({
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
        <button type="button" className={cn("min-h-11", relation === "self" ? "text-fg" : "text-fg-subtle")} onClick={() => setRelation("self")}>
          Mine
        </button>
        <button type="button" className={cn("min-h-11", relation === "other" ? "text-fg" : "text-fg-subtle")} onClick={() => setRelation("other")}>
          Someone else
        </button>
      </div>
      {relation === "other" ? (
        <input
          required
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          placeholder="Their name"
          className="min-h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-fg"
        />
      ) : null}
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
      <div className="grid grid-cols-3 gap-2">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="min-h-12 rounded-md border border-border bg-bg-elevated px-2 text-fg" required>
          <option value="">Month</option>
          {signMonths.map((m) => (
            <option key={m} value={m}>
              {MONTHS[m - 1]}
            </option>
          ))}
        </select>
        <select value={day} onChange={(e) => setDay(e.target.value)} className="min-h-12 rounded-md border border-border bg-bg-elevated px-2 text-fg" required disabled={!monthN}>
          <option value="">Day</option>
          {signDays.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="min-h-12 rounded-md border border-border bg-bg-elevated px-2 text-fg" required>
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <label className="flex min-h-11 items-start gap-2 text-sm text-fg-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>I consent to storing this birth date on my account.</span>
      </label>
      {relation === "other" ? (
        <label className="flex min-h-11 items-start gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={permission} onChange={(e) => setPermission(e.target.checked)} className="mt-1" />
          <span>I have this person’s permission to keep their birth date.</span>
        </label>
      ) : null}
      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-md bg-accent text-xs tracking-[0.22em] text-accent-fg uppercase disabled:opacity-50">
        Save to my vault
      </button>
    </form>
  );
}
