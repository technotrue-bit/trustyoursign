import { useEffect, useRef } from "react";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { useGalaxy } from "@/lib/galaxy/store";
import { noteControl, seekSign } from "@/lib/galaxy/travel";
import { cn } from "@/lib/utils";

function jumpTo(index: number) {
  return seekSign(index);
}

function nearestFromScroll(scroller: HTMLElement) {
  const mid = scroller.scrollLeft + scroller.clientWidth / 2;
  let best = 0;
  let bestDist = Infinity;
  for (const node of scroller.querySelectorAll<HTMLElement>("[data-sign-index]")) {
    const i = Number(node.dataset.signIndex);
    const c = node.offsetLeft + node.offsetWidth / 2;
    const d = Math.abs(c - mid);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Horizontal snap-strip of the twelve. Swipe to jump the sky faster than cruise. */
export function SignStrip() {
  const signIndex = useGalaxy((s) => s.signIndex);
  const moved = useGalaxy((s) => s.moved);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const fromStrip = useRef(false);
  const programmatic = useRef(false);
  const hands = useRef(false);
  const wheelUntil = useRef(0);
  const settle = useRef(0);
  const mounted = useRef(false);

  const centerItem = (index: number, smooth: boolean) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const item = scroller.querySelector<HTMLElement>(`[data-sign-index="${index}"]`);
    if (!item) return;
    programmatic.current = true;
    const left = item.offsetLeft - (scroller.clientWidth - item.offsetWidth) / 2;
    scroller.scrollTo({ left, behavior: smooth ? "smooth" : "instant" });
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(
      () => {
        programmatic.current = false;
        fromStrip.current = false;
      },
      smooth ? 720 : 40,
    );
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    centerItem(useGalaxy.getState().signIndex, false);
    const onWheel = (e: WheelEvent) => {
      hands.current = true;
      wheelUntil.current = performance.now() + 280;
      noteControl();
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
      e.stopPropagation();
    };
    const onUp = () => {
      hands.current = false;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  useEffect(() => {
    if (fromStrip.current) return;
    const smooth = mounted.current && moved;
    mounted.current = true;
    centerItem(signIndex, smooth);
  }, [signIndex, moved]);

  const onScroll = () => {
    if (programmatic.current) return;
    if (!hands.current && performance.now() > wheelUntil.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    fromStrip.current = true;
    const next = nearestFromScroll(el);
    if (next !== useGalaxy.getState().signIndex || !useGalaxy.getState().moved) {
      jumpTo(next);
    }
  };

  return (
    <ul
      ref={scrollerRef}
      className="sign-strip pointer-events-auto"
      aria-label="The twelve signs"
      onScroll={onScroll}
      onPointerDown={(e) => {
        e.stopPropagation();
        hands.current = true;
        noteControl();
      }}
    >
      {CONSTELLATIONS.map((c, i) => {
        const on = moved && i === signIndex;
        return (
          <li key={c.id} className="sign-strip-item" data-sign-index={i}>
            <button
              type="button"
              aria-label={`${c.name}, ${c.month}`}
              aria-pressed={on}
              aria-current={on ? "true" : undefined}
              onClick={() => {
                fromStrip.current = true;
                jumpTo(i);
                centerItem(i, true);
              }}
              className={cn(
                "flex min-h-12 w-full flex-col items-center justify-center px-3 py-2 md:min-h-11",
                "transition-[color,opacity] duration-200 ease-out",
                on ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              <span className={cn("font-display text-base tracking-tight italic md:text-lg", on && "text-accent")}>
                {c.name}
              </span>
              <span className="mt-0.5 text-xs tracking-wide">{c.span}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
