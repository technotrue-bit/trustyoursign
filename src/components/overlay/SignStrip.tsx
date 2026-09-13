import { useEffect, useRef, useState } from "react";
import { CALENDAR_SIGN_INDICES, CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { useGalaxy } from "@/lib/galaxy/store";
import { noteControl, seekSign } from "@/lib/galaxy/travel";

/** px/ms — above this, the belt soft-glows while rushing between signs. */
const RUSH_SPEED = 0.85;
/** How fast rush intensity falls once motion slows (units / second). */
const RUSH_DECAY = 3.2;

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

function userStripMotion(hands: boolean, wheelUntil: number) {
  return hands || performance.now() <= wheelUntil;
}

/** Horizontal snap-strip of the twelve. Swipe to jump the sky faster than cruise. */
export function SignStrip() {
  const signIndex = useGalaxy((s) => s.signIndex);
  const moved = useGalaxy((s) => s.moved);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const fromStrip = useRef(false);
  const programmatic = useRef(false);
  const hands = useRef(false);
  const wheelUntil = useRef(0);
  const settle = useRef(0);
  const mounted = useRef(false);
  const lastScroll = useRef({ left: 0, at: 0 });
  const rushRef = useRef(0);
  const rushRaf = useRef(0);
  const [rushing, setRushing] = useState(false);

  const paintRush = (next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    rushRef.current = clamped;
    const belt = beltRef.current;
    if (belt) belt.style.setProperty("--belt-rush", clamped.toFixed(3));
    setRushing(clamped > 0.04);
  };

  const stopRushDecay = () => {
    if (rushRaf.current) {
      cancelAnimationFrame(rushRaf.current);
      rushRaf.current = 0;
    }
  };

  const startRushDecay = () => {
    stopRushDecay();
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const next = rushRef.current - RUSH_DECAY * dt;
      if (next <= 0.01) {
        paintRush(0);
        rushRaf.current = 0;
        return;
      }
      paintRush(next);
      rushRaf.current = requestAnimationFrame(tick);
    };
    rushRaf.current = requestAnimationFrame(tick);
  };

  const noteRushFromScroll = (el: HTMLElement) => {
    if (programmatic.current) return;
    if (!userStripMotion(hands.current, wheelUntil.current)) return;
    const now = performance.now();
    const left = el.scrollLeft;
    const prev = lastScroll.current;
    const dt = now - prev.at;
    if (prev.at > 0 && dt > 0 && dt < 120) {
      const speed = Math.abs(left - prev.left) / dt;
      if (speed >= RUSH_SPEED) {
        stopRushDecay();
        // Map speed into a soft 0.55–1 band so slow-fast still glows gently.
        const intensity = Math.min(1, 0.55 + (speed - RUSH_SPEED) / 1.8);
        paintRush(Math.max(rushRef.current, intensity));
        startRushDecay();
      }
    }
    lastScroll.current = { left, at: now };
  };

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
        lastScroll.current = { left: scroller.scrollLeft, at: performance.now() };
      },
      smooth ? 720 : 40,
    );
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    lastScroll.current = { left: el.scrollLeft, at: performance.now() };
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
      noteRushFromScroll(el);
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
      stopRushDecay();
      window.clearTimeout(settle.current);
    };
  }, []);

  useEffect(() => {
    if (fromStrip.current) return;
    const smooth = mounted.current && moved;
    mounted.current = true;
    centerItem(signIndex, smooth);
  }, [signIndex, moved]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    noteRushFromScroll(el);
    if (programmatic.current) return;
    if (!userStripMotion(hands.current, wheelUntil.current)) return;
    fromStrip.current = true;
    const next = nearestFromScroll(el);
    if (next !== useGalaxy.getState().signIndex || !useGalaxy.getState().moved) {
      jumpTo(next);
    }
  };

  return (
    <div
      ref={beltRef}
      className={`sign-strip-belt pointer-events-auto${rushing ? " sign-strip-belt--rush" : ""}`}
      style={{ ["--belt-rush" as string]: "0" }}
    >
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
