import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus } from "lucide-react";
import { askTheChart } from "@/lib/chart/ask";
import { askTheSky } from "@/lib/chart/sky";
import { answerFromBones, answerFromShelf, answerFromSky } from "@/lib/chart/bones-ask";
import { formatBirth, formatClock } from "@/lib/chart/sun";
import { useNativity } from "@/lib/chart/nativity";
import { TEMPLE_SIGNS } from "@/lib/galaxy/temple-data";
import type { ChakraId, GateId, PlanetId, ReadingId, Selection } from "@/lib/chart/types";
import { isResearchChartId } from "@/lib/chart/types";
import {
  loadNotes,
  loadThread,
  saveNotes,
  saveThread,
  type FieldNote,
  type ThreadTurn,
} from "@/lib/field-notes";
import { loadAsk, saveAsk } from "@/lib/charts";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useVault } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Gloss, GlossRoot } from "./Gloss";
import { ChartSheet } from "./ChartSheet";

type Tab = "ask" | "field";

export function AskPanel() {
  const nat = useNativity();
  const chartIdLib = useVault((s) => s.chartId);
  const shelf = useVault((s) => s.shelf);
  const skyNatal = useVault((s) => s.skyNatal);
  const chartId = shelf?.id ?? chartIdLib ?? "";
  const selection = useVault((s) => s.selection);
  const { user, isPending } = useCurrentUserState();
  const signedIn = Boolean(user);
  const [tab, setTab] = useState<Tab>("ask");
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [thread, setThread] = useState<ThreadTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [fieldDraft, setFieldDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestAsks, setGuestAsks] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sky = shelf?.natal ?? (chartIdLib === "visitor" ? skyNatal : null);
  const about = sky && shelf
    ? (() => {
        const body = sky.bodies.find((b) => selection?.kind === "planet" && selection.id === b.id) ?? sky.bodies[0]!;
        return {
          key: `sky:${shelf.id}:${body.id}`,
          label: body.name,
          focus: body.id,
          ask: `What is my ${body.name.toLowerCase()} holding?`,
        };
      })()
    : shelf
      ? {
          key: `shelf:${shelf.id}`,
          label: TEMPLE_SIGNS.find((s) => s.id === shelf.signId)?.name ?? shelf.signId,
          focus: shelf.signId,
          ask: `What does this sun sign hold?`,
        }
      : questionFor(selection, nat);
  const doors = nat && chartIdLib === "visitor"
    ? (nat.suggested ?? [])
    : sky && shelf
      ? ["What is my sun holding?", "What is my moon holding?", "What is my rising holding?"]
      : shelf
        ? [
            "What does this sun sign hold?",
            "What don't you have for me yet?",
            "What is the chakra for this sign?",
          ]
        : (nat?.suggested ?? []);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const persist = (nextThread: ThreadTurn[], nextNotes: FieldNote[]) => {
    saveThread(chartId, nextThread);
    saveNotes(chartId, nextNotes);
    if (signedIn && chartId) {
      void saveAsk({ data: { chartKey: chartId, thread: nextThread, notes: nextNotes } }).catch(() => {
        /* keep the local copy if the account write fails */
      });
    }
  };

  useEffect(() => {
    if (isPending) return;
    let cancelled = false;
    const localT = loadThread(chartId);
    const localN = loadNotes(chartId);
    setThread(localT);
    setNotes(localN);
    setError(null);
    setDraft("");
    if (!user) return;
    void loadAsk({ data: chartId })
      .then((remote) => {
        if (cancelled) return;
        const empty = remote.thread.length === 0 && remote.notes.length === 0;
        if (empty) {
          if (localT.length || localN.length) {
            void saveAsk({ data: { chartKey: chartId, thread: localT, notes: localN } }).catch(() => {});
          }
          return;
        }
        setThread(remote.thread);
        setNotes(remote.notes);
        saveThread(chartId, remote.thread);
        saveNotes(chartId, remote.notes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chartId, user?.id, isPending]);

  useEffect(() => {
    if (!about) return;
    setDraft(about.ask);
    inputRef.current?.focus();
  }, [about?.key]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread, pending]);

  async function submit(question: string) {
    const q = question.trim();
    if (q.length < 2 || pending) return;
    setError(null);
    setDraft("");
    const nextThread: ThreadTurn[] = [...thread, { role: "user", text: q }];
    setThread(nextThread);
    persist(nextThread, notesRef.current);
    setPending(true);
    try {
      let text = "";
      if (nat && chartIdLib === "visitor") {
        if (signedIn && skyNatal) {
          const result = await askTheSky({
            data: { natal: skyNatal, question: q, history: thread, focus: about?.focus },
          });
          text = result.text;
        } else if (!signedIn && guestAsks >= 2) {
          text =
            "The bones answered twice as a guest. Sign in to keep the thread, ask the machine, and save this natal.";
        } else {
          text = answerFromBones(nat, q, about?.focus);
          if (!signedIn) setGuestAsks((n) => n + 1);
        }
      } else if (sky && shelf) {
        if (signedIn) {
          const result = await askTheSky({
            data: { natal: sky, question: q, history: thread, focus: about?.focus },
          });
          text = result.text;
        } else {
          text = answerFromSky(sky, q, about?.focus);
        }
      } else if (shelf) {
        const sign = TEMPLE_SIGNS.find((s) => s.id === shelf.signId) ?? TEMPLE_SIGNS[0]!;
        const who = shelf.personName || (shelf.relation === "self" ? "you" : shelf.label);
        const when = [
          formatBirth(shelf.birthMonth, shelf.birthDay, shelf.birthYear),
          shelf.birthHour != null && shelf.birthMinute != null ? formatClock(shelf.birthHour, shelf.birthMinute) : "",
          shelf.birthPlace ?? "",
        ]
          .filter(Boolean)
          .join(" · ");
        text = answerFromShelf(sign, q, when, who, Boolean(shelf.birthPlace));
      } else if (nat && isResearchChartId(chartIdLib)) {
        const result = await askTheChart({
          data: {
            chartId: chartIdLib,
            question: q,
            notes: notes.map((n) => n.text),
            history: thread,
            focus: about?.focus,
          },
        });
        text = result.ok ? result.text : answerFromBones(nat, q, about?.focus);
      } else if (nat) {
        text = answerFromBones(nat, q, about?.focus);
      } else {
        text = "The bones do not hold that.";
      }
      const done: ThreadTurn[] = [...nextThread, { role: "vault", text }];
      setThread(done);
      persist(done, notesRef.current);
      setError(null);
    } catch {
      const skyN = shelf?.natal ?? skyNatal;
      const sign = shelf ? TEMPLE_SIGNS.find((s) => s.id === shelf.signId) : null;
      const text = nat
        ? answerFromBones(nat, q, about?.focus)
        : skyN
          ? answerFromSky(skyN, q, about?.focus)
          : sign
            ? answerFromShelf(
                sign,
                q,
                [
                  formatBirth(shelf!.birthMonth, shelf!.birthDay, shelf!.birthYear),
                  shelf!.birthHour != null && shelf!.birthMinute != null ? formatClock(shelf!.birthHour, shelf!.birthMinute) : "",
                  shelf!.birthPlace ?? "",
                ]
                  .filter(Boolean)
                  .join(" · "),
                shelf!.personName || shelf!.label,
                Boolean(shelf!.birthPlace),
              )
            : "The bones do not hold that.";
      const done: ThreadTurn[] = [...nextThread, { role: "vault", text }];
      setThread(done);
      persist(done, notesRef.current);
      setError(null);
    } finally {
      setPending(false);
    }
  }

  function addNote() {
    const text = fieldDraft.trim();
    if (text.length < 8) return;
    const next = [...notes, { id: String(Date.now()), text: text.slice(0, 8000), at: Date.now() }];
    setNotes(next);
    persist(thread, next);
    setFieldDraft("");
  }

  function removeNote(id: string) {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    persist(thread, next);
  }

  return (
    <ChartSheet label="the machine" fill>
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.18em] text-fg-muted uppercase">The machine</p>
          <h2 className="mt-0.5 font-display text-xl leading-snug font-medium tracking-tight text-fg italic">
            Ask the chart
          </h2>
          {about && !shelf ? (
            <p className="mt-1 truncate text-sm text-fg-muted">Looking at {about.label}.</p>
          ) : sky ? (
            <p className="mt-1 truncate text-sm text-fg-muted">
              Looking at {about?.label}. The Big Three.
            </p>
          ) : shelf ? (
            <p className="mt-1 truncate text-sm text-fg-muted">
              Sun-sign shelf · {about?.label}. Not a natal.
            </p>
          ) : (
            <p className="mt-1 text-sm text-fg-muted">
              {signedIn ? "Tap a body in the sky. This talk stays on your account." : "Tap a planet, sign, or chakra in the sky."}
            </p>
          )}
        </div>
        <div className="flex shrink-0 rounded-md bg-bg-subtle p-1">
          <TabButton on={tab === "ask"} onClick={() => setTab("ask")}>
            Ask
          </TabButton>
          <TabButton on={tab === "field"} onClick={() => setTab("field")}>
            Field
          </TabButton>
        </div>
      </header>

      {tab === "ask" ? (
        <>
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">
            <GlossRoot>
            {thread.length === 0 ? (
              <p className="text-sm text-fg-muted">Start with the questions the book itself uses.</p>
            ) : (
              <ol className="space-y-5">
                {thread.map((turn, i) => (
                  <li key={`${turn.role}-${i}`}>
                    {turn.role === "user" ? (
                      <p className="text-xs tracking-[0.16em] text-fg-subtle uppercase">Question</p>
                    ) : (
                      <p className="text-xs tracking-[0.16em] text-fg-subtle uppercase">The vault</p>
                    )}
                    <div className="mt-1 space-y-3 text-sm leading-relaxed text-fg">
                      {turn.text.split(/\n\n+/).map((p) => (
                        <p key={p.slice(0, 32)}>
                          {turn.role === "vault" ? <Gloss>{p}</Gloss> : p}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
                {pending ? (
                  <li className="text-sm text-fg-muted">The machine is reading the bones…</li>
                ) : null}
              </ol>
            )}
            <ul className={cn("flex flex-wrap gap-2", thread.length ? "mt-6" : "mt-4")}>
              {doors.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => void submit(q)}
                    disabled={pending}
                    className="min-h-11 rounded-md border border-border bg-bg px-3 text-left text-sm text-fg-muted transition-colors duration-150 hover:text-fg disabled:opacity-50"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
            {error ? <p className="mt-4 text-sm text-fg-muted">{error}</p> : null}
            </GlossRoot>
          </div>
          <form
            className="flex shrink-0 gap-2 border-t border-border p-3 md:p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(draft);
            }}
          >
            <label className="sr-only" htmlFor="ask-input">
              Ask the chart
            </label>
            <textarea
              id="ask-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(draft);
                }
              }}
              rows={2}
              maxLength={500}
              placeholder="Ask in her language. The bones will answer."
              className="min-h-12 flex-1 resize-none rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
            />
            <button
              type="submit"
              disabled={pending || draft.trim().length < 2}
              className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg transition-transform duration-150 ease-out hover:opacity-90 active:scale-[0.96] disabled:opacity-40"
              aria-label="Ask"
            >
              <ArrowUp className="size-4" />
            </button>
          </form>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">
          <p className="text-sm leading-relaxed text-fg-muted">
            Paste more of the conversation — transits, corrections, stories, another pass at the
            chart. Signed in, it lives on this chart in your account. Signed out, it stays on this
            device. It is sent with every question.
          </p>
          <div className="mt-4">
            <label className="sr-only" htmlFor="field-input">
              Field note
            </label>
            <textarea
              id="field-input"
              value={fieldDraft}
              onChange={(e) => setFieldDraft(e.target.value)}
              rows={7}
              maxLength={8000}
              placeholder="Paste source text. Date, time, and place stay locked unless the note explicitly corrects them."
              className="w-full resize-y rounded-md border border-border bg-bg px-3 py-3 text-sm leading-relaxed text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
            />
            <button
              type="button"
              onClick={addNote}
              disabled={fieldDraft.trim().length < 8}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-transform duration-150 ease-out hover:opacity-90 active:scale-[0.96] disabled:opacity-40"
            >
              <Plus className="size-4" />
              Add to the bones
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="mt-6 text-sm text-fg-subtle">No field notes yet. The original chart stands alone.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {notes.map((n, i) => (
                <li key={n.id} className="rounded-md border border-border bg-bg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs tracking-[0.16em] text-fg-subtle uppercase">
                      Note {i + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeNote(n.id)}
                      className="min-h-11 px-2 text-xs tracking-wide text-fg-muted uppercase hover:text-fg"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-fg-muted">{n.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ChartSheet>
  );
}

function questionFor(sel: Selection, nat: NonNullable<ReturnType<typeof useNativity>> | null) {
  if (!sel || !nat) return null;
  if (sel.kind === "planet") {
    const p = nat.planetById[sel.id as PlanetId];
    if (!p) return null;
    return { key: `planet:${p.id}`, label: p.name, focus: `${p.name} (${p.id})`, ask: `What is ${p.name} doing in this chart?` };
  }
  if (sel.kind === "sign") {
    const s = nat.signs.find((x) => x.id === sel.id);
    const name = s?.name ?? sel.id;
    return { key: `sign:${sel.id}`, label: name, focus: `the sign ${name}`, ask: `What does ${name} hold here?` };
  }
  if (sel.kind === "chakra") {
    const c = nat.chakraById[sel.id as ChakraId];
    if (!c) return null;
    return { key: `chakra:${c.id}`, label: c.name, focus: `the ${c.name} chakra`, ask: `What is the ${c.name} doing in this body?` };
  }
  if (sel.kind === "gate") {
    const g = nat.gateById[sel.id as GateId];
    const name = g?.name ?? sel.id;
    return { key: `gate:${sel.id}`, label: name, focus: `the ${name} gate`, ask: `What is the ${name} gate?` };
  }
  if (sel.kind === "reading") {
    const r = nat.readingById[sel.id as ReadingId];
    const name = r?.name ?? sel.id;
    return { key: `reading:${sel.id}`, label: name, focus: `the ${name} reading`, ask: `Read ${name}.` };
  }
  if (sel.kind === "step") {
    return { key: `step:${sel.id}`, label: `Step ${sel.id}`, focus: `decision step ${sel.id}`, ask: `What is decision step ${sel.id}?` };
  }
  return null;
}

function TabButton({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "min-h-11 rounded-sm px-4 text-sm transition-colors duration-150",
        on ? "bg-bg-elevated text-fg" : "text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
