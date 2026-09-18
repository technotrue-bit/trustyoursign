import { useEffect, useLayoutEffect, useState } from "react";
import {
  markSkyGuideDone,
  shouldStartSkyGuide,
  skyGuideBeats,
  type SkyGuideBeat,
} from "@/lib/chart/sky-guide";
import { useSessionKind } from "@/lib/chart/session/hooks";
import { useSessionStore } from "@/lib/chart/session/store";
import { StarRevealText } from "./StarRevealText";
import { cn } from "@/lib/utils";

type CardPos = { top: number; left: number; maxWidth: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function positionFor(target: Element | null, cardW: number, cardH: number): CardPos {
  const pad = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxWidth = Math.min(cardW, vw - pad * 2);
  if (!target) {
    return { top: pad + 72, left: pad, maxWidth };
  }
  const r = target.getBoundingClientRect();
  const preferAbove = r.top > vh * 0.45;
  let top = preferAbove ? r.top - cardH - 14 : r.bottom + 14;
  let left = r.left + r.width / 2 - maxWidth / 2;

  if (target.getAttribute("data-sky-guide") === "dock") {
    top = r.top - cardH - 16;
    left = r.left + r.width / 2 - maxWidth / 2;
  }
  if (target.getAttribute("data-sky-guide") === "sky") {
    top = Math.min(vh * 0.28, r.top + r.height * 0.22);
    left = pad;
  }
  if (target.getAttribute("data-sky-guide") === "ask") {
    top = r.top - cardH - 16;
    left = r.right - maxWidth;
  }
  if (target.getAttribute("data-sky-guide") === "sheet") {
    top = Math.max(pad + 64, r.top - cardH - 12);
    left = clamp(r.left, pad, vw - maxWidth - pad);
  }

  top = clamp(top, pad + 56, vh - cardH - pad);
  left = clamp(left, pad, vw - maxWidth - pad);
  return { top, left, maxWidth };
}

function useGuideTarget(selector: string | null) {
  const [el, setEl] = useState<Element | null>(null);
  useLayoutEffect(() => {
    if (!selector) {
      setEl(null);
      return;
    }
    const find = () => document.querySelector(selector);
    setEl(find());
    const id = window.setInterval(() => setEl(find()), 400);
    return () => window.clearInterval(id);
  }, [selector]);
  return el;
}

export function SkyGuide() {
  const kind = useSessionKind();
  const setMode = useSessionStore((s) => s.setMode);
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState<CardPos>({ top: 80, left: 12, maxWidth: 320 });
  const [revealKey, setRevealKey] = useState(0);

  const beats = kind ? skyGuideBeats(kind) : [];
  const beat: SkyGuideBeat | undefined = active ? beats[index] : undefined;
  const target = useGuideTarget(beat ? `[data-sky-guide="${beat.target}"]` : null);

  useEffect(() => {
    if (!kind) return;
    if (!shouldStartSkyGuide(kind)) return;
    setActive(true);
    setIndex(0);
    setRevealKey((k) => k + 1);
  }, [kind]);

  useEffect(() => {
    if (!beat?.mode) return;
    setMode(beat.mode);
  }, [beat?.id, beat?.mode, setMode]);

  useLayoutEffect(() => {
    if (!beat) return;
    const cardW = 320;
    const cardH = 168;
    const update = () => setPos(positionFor(target, cardW, cardH));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [beat, target, revealKey]);

  useEffect(() => {
    if (!target || !beat) return;
    target.classList.add("sky-guide-glow");
    return () => target.classList.remove("sky-guide-glow");
  }, [target, beat?.id]);

  if (!beat) return null;

  const more = index < beats.length - 1;
  const finish = () => {
    markSkyGuideDone();
    setActive(false);
    window.dispatchEvent(new Event("vault-sky-guide-done"));
  };
  const next = () => {
    if (!more) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
    setRevealKey((k) => k + 1);
  };

  return (
    <aside
      className="sky-guide-card pointer-events-auto fixed z-50"
      style={{ top: pos.top, left: pos.left, width: pos.maxWidth }}
      data-no-fly
      role="dialog"
      aria-labelledby="sky-guide-title"
    >
      <div className="rounded-xl border border-border bg-bg-elevated/96 p-4 shadow-[var(--shadow-border)] backdrop-blur-sm">
        <p className="text-[0.7rem] tracking-[0.22em] text-accent uppercase">{beat.kicker}</p>
        <h2
          id="sky-guide-title"
          className="mt-2 font-display text-xl tracking-tight text-fg italic md:text-2xl"
        >
          {beat.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          <StarRevealText key={revealKey} text={beat.body} active />
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={next}
            className={cn(
              "min-h-11 rounded-md bg-accent px-4 text-xs tracking-[0.18em] text-accent-fg uppercase",
            )}
          >
            {more ? "Next" : "Got it"}
          </button>
          <button
            type="button"
            onClick={finish}
            className="min-h-11 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
          >
            Skip
          </button>
        </div>
      </div>
    </aside>
  );
}
