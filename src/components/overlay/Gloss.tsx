import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { lexById, splitGloss } from "@/lib/chart/lexicon";
import { lexDeep } from "@/lib/chart/lexicon-deep";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { cn } from "@/lib/utils";

type GlossState = {
  lit: string | null;
  open: string | null;
  openId: string | null;
  pageId: string | null;
  tap: (uid: string, id: string) => void;
  expand: (id: string) => void;
  closePage: () => void;
};

const GlossCtx = createContext<GlossState | null>(null);

export function GlossRoot({ children }: { children: ReactNode }) {
  const [lit, setLit] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);

  const tap = useCallback((uid: string, id: string) => {
    if (lit === uid && open !== uid) {
      setOpen(uid);
      setOpenId(id);
      return;
    }
    if (lit === uid && open === uid) {
      setLit(null);
      setOpen(null);
      setOpenId(null);
      return;
    }
    setLit(uid);
    setOpen(null);
    setOpenId(null);
  }, [lit, open]);

  const expand = useCallback((id: string) => {
    setPageId(id);
  }, []);

  const closePage = useCallback(() => setPageId(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pageId) {
        e.stopImmediatePropagation();
        setPageId(null);
        return;
      }
      if (!lit && !open) return;
      e.stopImmediatePropagation();
      setLit(null);
      setOpen(null);
      setOpenId(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lit, open, pageId]);

  const value = useMemo(
    () => ({ lit, open, openId, pageId, tap, expand, closePage }),
    [lit, open, openId, pageId, tap, expand, closePage],
  );
  return (
    <GlossCtx.Provider value={value}>
      {children}
      {pageId && typeof document !== "undefined"
        ? createPortal(<GlossEssay id={pageId} onClose={closePage} />, document.body)
        : null}
    </GlossCtx.Provider>
  );
}

function useGloss() {
  return useContext(GlossCtx);
}

/** Mark glossary words in a line of vault copy. First tap glows. Second tap opens the meaning. */
export function Gloss({ children, card = true }: { children: string; card?: boolean }) {
  const ctx = useGloss();
  const stem = useId();
  const parts = useMemo(() => splitGloss(children), [children]);
  if (!ctx) return <>{children}</>;

  const openId = card ? parts.find((p, i) => p.id && ctx.open === `${stem}-${i}`)?.id : undefined;

  return (
    <>
      {parts.map((part, i) => {
        if (!part.id) return <span key={`${stem}-t-${i}`}>{part.text}</span>;
        const uid = `${stem}-${i}`;
        const lit = ctx.lit === uid;
        const opened = ctx.open === uid;
        return (
          <button
            key={uid}
            type="button"
            className={cn("gloss-word", lit && "is-lit", opened && "is-open")}
            aria-expanded={opened}
            aria-haspopup="dialog"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              ctx.tap(uid, part.id!);
            }}
          >
            {part.text}
          </button>
        );
      })}
      {openId ? <GlossCard id={openId} uid={ctx.open!} /> : null}
    </>
  );
}

/** Park the meaning card in a chosen slot instead of inside the sentence. */
export function GlossStage({ className }: { className?: string }) {
  const ctx = useGloss();
  if (!ctx?.open || !ctx.openId) return null;
  return (
    <div className={cn("pointer-events-auto", className)}>
      <GlossCard id={ctx.openId} uid={ctx.open} />
    </div>
  );
}

function GlossCard({ id, uid }: { id: string; uid: string }) {
  const entry = lexById(id);
  const ctx = useGloss();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [uid]);
  if (!entry || !ctx) return null;
  return (
    <span ref={ref} className="gloss-card" role="region" aria-label={entry.word}>
      <p className="text-xs tracking-[0.22em] text-fg-subtle uppercase">{entry.word}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg">{entry.info}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{entry.meaning}</p>
      <p className="mt-3 font-display text-sm leading-snug tracking-tight text-fg italic">{entry.truth}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          className="min-h-11 text-xs tracking-[0.18em] text-fg-subtle uppercase transition-colors duration-150 hover:text-fg"
          onClick={(e) => {
            e.stopPropagation();
            ctx.tap(uid, id);
          }}
        >
          Close
        </button>
        <button
          type="button"
          className="min-h-11 text-xs tracking-[0.18em] text-accent uppercase transition-colors duration-150 hover:text-fg"
          onClick={(e) => {
            e.stopPropagation();
            ctx.expand(id);
          }}
        >
          Expand
        </button>
      </div>
    </span>
  );
}

function GlossEssay({ id, onClose }: { id: string; onClose: () => void }) {
  const entry = lexById(id);
  const deep = lexDeep(id);
  const dialogRef = useDialogFocus<HTMLDivElement>(Boolean(entry));
  if (!entry) return null;
  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[80] overflow-y-auto bg-bg text-fg outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={entry.word}
    >
      <article className="mx-auto max-w-lg px-5 pt-[var(--chrome-top)] pb-[max(2.5rem,var(--chrome-bottom))]">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 text-xs tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
        >
          Back
        </button>
        <p className="mt-6 text-[0.7rem] tracking-[0.22em] text-accent uppercase">The longer cut</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg italic">{entry.word}</h1>
        <p className="mt-4 font-display text-lg leading-snug tracking-tight text-fg italic">{entry.truth}</p>
        <div className="mt-8 space-y-4 border-t border-border pt-6">
          {deep.map((p) => (
            <p key={p.slice(0, 28)} className="text-sm leading-relaxed text-fg">
              {p}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-10 min-h-12 text-xs tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
        >
          Close
        </button>
      </article>
    </div>
  );
}
