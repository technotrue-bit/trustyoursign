import { useEffect, useRef, useState } from "react";
import { frameMeterEnabled, summarizeFrames, takeSkyDraws } from "@/lib/frame-meter";

/** `?fps=1` overlay: fps, p95 frame time, slow frames, and sky draws per second. */
export function FrameMeter() {
  const [on, setOn] = useState(false);
  const label = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOn(frameMeterEnabled(window.location.search));
  }, []);

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = 0;
    let windowStart = 0;
    let intervals: number[] = [];
    takeSkyDraws();
    const loop = (now: number) => {
      if (last > 0) intervals.push(now - last);
      else windowStart = now;
      last = now;
      if (now - windowStart >= 1000) {
        const s = summarizeFrames(intervals, takeSkyDraws());
        // Text only, no React state, so the meter doesn't re-render the tree it measures.
        if (label.current) {
          label.current.textContent = `${s.fps} fps · p95 ${s.p95Ms.toFixed(1)}ms · slow ${s.slowPct}% · draws ${s.drawsPerSec}/s`;
        }
        intervals = [];
        windowStart = now;
      }
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => {
      // A hidden tab's gap would read as one huge slow frame.
      last = 0;
      intervals = [];
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [on]);

  if (!on) return null;
  return (
    <div
      ref={label}
      aria-hidden="true"
      className="pointer-events-none fixed left-2 z-[9999] rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white"
      style={{ top: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      measuring…
    </div>
  );
}
