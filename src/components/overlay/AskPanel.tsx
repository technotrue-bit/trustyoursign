import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus } from "lucide-react";
import { askTheChart } from "@/lib/chart/ask";
import { useNativity } from "@/lib/chart/nativity";
import {
  loadNotes,
  loadThread,
  saveNotes,
  saveThread,
  type FieldNote,
  type ThreadTurn,
} from "@/lib/field-notes";
import { useVault } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Gloss, GlossRoot } from "./Gloss";

type Tab = "ask" | "field";

export function AskPanel() {
  const nat = useNativity();
  const chartId = useVault((s) => s.chartId) ?? nat.id;
  const [tab, setTab] = useState<Tab>("ask");
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [thread, setThread] = useState<ThreadTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [fieldDraft, setFieldDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotes(loadNotes(chartId));
    setThread(loadThread(chartId));
    setError(null);
    setDraft("");
  }, [chartId]);

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
    saveThread(chartId, nextThread);
    setPending(true);
    try {
      const result = await askTheChart({
        data: {
          chartId,
          question: q,
          notes: notes.map((n) => n.text),
          history: thread,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const done: ThreadTurn[] = [...nextThread, { role: "vault", text: result.text }];
      setThread(done);
      saveThread(chartId, done);
    } catch {
      setError("The machine did not answer. Try again.");
    } finally {
      setPending(false);
    }
  }

  function addNote() {
    const text = fieldDraft.trim();
    if (text.length < 8) return;
    const next = [...notes, { id: String(Date.now()), text: text.slice(0, 8000), at: Date.now() }];
    setNotes(next);
    saveNotes(chartId, next);
    setFieldDraft("");
  }

  function removeNote(id: string) {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    saveNotes(chartId, next);
  }

  return (
    <aside
      className={cn(
        "pointer-events-auto panel-enter absolute z-20 flex flex-col",
        "border border-border bg-bg-elevated/94 text-fg shadow-[var(--shadow-border)] backdrop-blur-sm",
        "max-md:top-3 max-md:right-3 max-md:bottom-24 max-md:left-3 max-md:rounded-xl",
        "md:top-5 md:right-5 md:bottom-24 md:left-5 md:rounded-xl",
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 pl-16 md:px-6 md:pl-20">
        <div>
          <p className="text-xs tracking-[0.18em] text-fg-muted uppercase">The machine</p>
          <h2 className="mt-1 font-display text-2xl leading-snug font-medium tracking-tight text-fg italic">
            Ask the chart. Add to the bones.
          </h2>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">
            {nat.meta.name} is the source. Questions come back in that voice. Paste more conversation
            as field notes and it becomes canon.
          </p>
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
              <div>
                <p className="text-sm text-fg-muted">Start with the questions the book itself uses.</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {nat.suggested.map((q) => (
                    <li key={q}>
                      <button
                        type="button"

... 