import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { listCharts, type SavedChart } from "@/lib/charts";
import { getResearchChart, listResearchLibrary } from "@/lib/chart/research";
import { openSavedChart, useSessionStore } from "@/lib/chart/session";
import { isResearchChartId, type ChartId } from "@/lib/chart/types";
import { SITE_OWNER } from "@/lib/owner";
import { classifyOwnerFetchError, forgetOwnerVerdict, useOwnerVerdict } from "@/lib/owner-state";
import { Gloss, GlossRoot } from "./Gloss";

export function LibraryShell() {
  return <Intro />;
}

function Intro() {
  const user = useCurrentUser();
  // Server truth, not the cosmetic client check — the research fetch behind each
  // book is owner-gated, so a cosmetic "owner" here rendered books that 404'd.
  const owner = useOwnerVerdict(user?.id) === true;
  const [desk, setDesk] = useState<
    { id: ChartId; title: string; oneCut: string; date: string }[] | null
  >(null);
  const [busyId, setBusyId] = useState<ChartId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!owner) {
      setDesk(null);
      return;
    }
    listResearchLibrary()
      .then(setDesk)
      .catch(() => setDesk([]));
  }, [owner]);

  const openResearch = async (id: ChartId) => {
    if (!isResearchChartId(id) || busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const nat = await getResearchChart({ data: id });
      useSessionStore.getState().openResearch(id, nat);
    } catch (err) {
      const kind = classifyOwnerFetchError(err);
      console.error("[library] openResearch failed", kind, err);
      if (kind !== "unreachable") forgetOwnerVerdict(user?.id);
      setError(
        kind === "signed_out"
          ? "Your sign-in lapsed. Sign in again to open the desk."
          : kind === "not_owner"
            ? "The desk isn’t unlocked for this sign-in."
            : "That chart wouldn’t open. Try again in a moment.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-start md:items-center">
      <div className="absolute inset-0 bg-gradient-to-r from-bg from-25% via-bg/80 to-transparent" />
      <div className="stagger-in relative max-w-xl px-6 pt-16 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-12">
        <h1 className="font-display text-5xl leading-[1.05] font-medium tracking-tight text-fg italic md:text-6xl">
          Trust Your Sign
        </h1>
        <p className="mt-2 text-[0.7rem] tracking-[0.22em] text-fg-subtle uppercase">
          Kept by {SITE_OWNER.name} · {SITE_OWNER.handle}
        </p>
        <p className="mt-5 max-w-md text-base leading-relaxed text-fg-muted md:text-lg">
          <GlossRoot>
            <Gloss>
              {owner
                ? "Research desk. Timed charts stay here. Degrees first. Meaning second."
                : "A sun-sign shelf for the date you bring. The sky does not argue."}
            </Gloss>
          </GlossRoot>
        </p>
        {owner ? (
          <ul className="mt-8 space-y-3">
            {desk === null ? (
              <li className="h-16 animate-pulse rounded-md bg-bg-subtle" />
            ) : (
              desk.map((book) => (
                <li key={book.id}>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    aria-busy={busyId === book.id || undefined}
                    onClick={() => void openResearch(book.id)}
                    className="w-full rounded-md border border-border bg-bg-elevated/80 px-4 py-4 text-left transition-colors duration-150 hover:bg-bg-subtle disabled:cursor-default disabled:opacity-60"
                  >
                    <p className="font-display text-xl tracking-tight text-fg italic">
                      {book.title}
                    </p>
                    <p className="mt-1 text-sm text-fg-muted">{book.oneCut}</p>
                    <p className="mt-1 text-xs tracking-wide text-fg-subtle uppercase">
                      {busyId === book.id ? (
                        <span aria-live="polite">Opening…</span>
                      ) : (
                        <>
                          {book.id === "saige" ? "Premium house" : "Walkthrough"} · {book.date} ·
                          research
                        </>
                      )}
                    </p>
                  </button>
                </li>
              ))
            )}
            {error ? (
              <li>
                <p role="alert" className="text-xs leading-snug text-wine">
                  {error}
                </p>
              </li>
            ) : null}
            <li>
              <div className="rounded-md border border-dashed border-border px-4 py-4">
                <p className="font-display text-xl tracking-tight text-fg italic">The third</p>
                <p className="mt-1 text-sm text-fg-muted">
                  Sealed. When the house is finished, this is where it all comes together.
                </p>
                <p className="mt-1 text-xs tracking-wide text-fg-subtle uppercase">
                  Not yet · owner
                </p>
              </div>
            </li>
          </ul>
        ) : null}
        <SavedShelf />
      </div>
    </div>
  );
}

function SavedShelf() {
  const user = useCurrentUser();
  const [rows, setRows] = useState<SavedChart[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  const open = async (c: SavedChart) => {
    if (busyId) return;
    setBusyId(c.id);
    setError(null);
    try {
      await openSavedChart(c, "library");
    } catch (err) {
      console.error("[library] openSavedChart failed", err);
      setError("That chart wouldn’t open. Try again in a moment.");
    } finally {
      setBusyId(null);
    }
  };
  // Depend on the id, not the object: the session hook rebuilds `user` on every
  // render, so a `[user]` dependency re-fetches in a loop (fetch → setState → render).
  useEffect(() => {
    if (!userId) {
      setRows(null);
      return;
    }
    listCharts()
      .then(setRows)
      .catch(() => setRows([]));
  }, [userId]);
  if (!user) {
    return (
      <p className="mt-6 text-sm text-fg-muted">
        <Link to="/login" className="text-fg underline">
          Sign in
        </Link>{" "}
        to keep your chart, and other people's, on this vault.
      </p>
    );
  }
  if (rows === null) return <div className="mt-6 h-12 animate-pulse rounded-md bg-bg-subtle" />;
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-fg-muted">
        No saved charts yet.{" "}
        <Link to="/account" className="text-fg underline">
          Open your account
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="mt-8">
      <p className="text-[0.7rem] tracking-[0.2em] text-fg-subtle uppercase">Saved</p>
      <ul className="mt-3 space-y-2">
        {rows.slice(0, 6).map((c) => (
          <li key={c.id}>
            <button
              type="button"
              disabled={busyId !== null}
              aria-busy={busyId === c.id || undefined}
              onClick={() => void open(c)}
              className="w-full rounded-md border border-border px-4 py-3 text-left hover:bg-bg-subtle disabled:cursor-default disabled:opacity-60"
            >
              <p className="font-display text-lg text-fg italic">{c.label}</p>
              <p className="text-xs tracking-wide text-fg-subtle uppercase">
                {busyId === c.id ? (
                  <span aria-live="polite">Opening…</span>
                ) : (
                  <>
                    {c.signId} · {c.birthMonth}/{c.birthDay}/{c.birthYear}
                    {c.birthPlace ? ` · ${c.birthPlace}` : ""}
                    {c.natal ? " · natal" : " · sun-sign shelf"}
                  </>
                )}
              </p>
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="mt-2 text-xs leading-snug text-wine">
          {error}
        </p>
      ) : null}
      <Link
        to="/account"
        className="mt-3 inline-flex min-h-11 items-center text-xs tracking-[0.18em] text-fg-muted uppercase"
      >
        All charts
      </Link>
    </div>
  );
}
