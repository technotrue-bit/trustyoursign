import { useEffect, useRef } from "react";
import { CALENDAR_SIGN_INDICES, CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { useGalaxy } from "@/lib/galaxy/store";
import { noteControl, seekSign } from "@/lib/galaxy/travel";

/** Strip jumps always use direct seek so left/right feel the same short lerp. */
function jumpTo(index: number) {
  return seekSign(index, { direct: true });
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
    <div className="sign-strip-belt pointer-events-auto">
      <ul
        ref={scrollerRef}
        className="sign-strip"
        aria-label="The twelve signs"
        onScroll={onScroll}
        onPointerDown={(e) => {
          e.stopPropagation();
          hands.current = true;
          noteControl();
        }}
      >
        {CALENDAR_SIGN_INDICES.map((i) => {
          const c = CONSTELLATIONS[i]!;
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
                  noteControl();
                  jumpTo(i);
                  centerItem(i, true);
                }}
                className="sign-strip-btn"
              >
                <span className="sign-strip-name">{c.name}</span>
                <span className="sign-strip-span">{c.span}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
