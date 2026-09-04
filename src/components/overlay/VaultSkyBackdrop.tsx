import { useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; phase: number; speed: number };

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function seedStars(w: number, h: number, n: number): Star[] {
  const out: Star[] = [];
  let s = 0x9e3779b9;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
  for (let i = 0; i < n; i++) {
    out.push({
      x: rnd() * w,
      y: rnd() * h,
      r: 0.4 + rnd() * 1.1,
      phase: rnd() * Math.PI * 2,
      speed: 0.4 + rnd() * 0.9,
    });
  }
  return out;
}

/**
 * Lightweight ambient sky for flat vault pages — nebula + mid galaxy + sparse stars.
 * Not the WebGL temple; decorative only (~10% star presence).
 */
export function VaultSkyBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let reduced = prefersReducedMotion();
    let visible = document.visibilityState !== "hidden";

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      starsRef.current = seedStars(w, h, Math.min(180, Math.floor((w * h) / 9000)));
      if (reduced) paint(0);
    };

    const paint = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.1;
      for (const star of starsRef.current) {
        const twinkle = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * star.speed + star.phase);
        ctx.beginPath();
        ctx.fillStyle = `rgba(232, 216, 192, ${twinkle})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      if (!visible) return;
      paint(now * 0.001);
      if (!reduced) rafRef.current = requestAnimationFrame(frame);
    };

    const onVis = () => {
      visible = document.visibilityState !== "hidden";
      if (visible && !reduced) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(rafRef.current);
      }
    };

    const onMotion = () => {
      reduced = prefersReducedMotion();
      cancelAnimationFrame(rafRef.current);
      resize();
      if (!reduced && visible) rafRef.current = requestAnimationFrame(frame);
    };

    resize();
    if (!reduced && visible) rafRef.current = requestAnimationFrame(frame);
    else paint(0);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVis);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener?.("change", onMotion);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mq.removeEventListener?.("change", onMotion);
    };
  }, []);

  return (
    <div className="vault-sky pointer-events-none overflow-hidden" aria-hidden>
      <div className="vault-sky-nebula absolute inset-0" />
      <div className="vault-sky-galaxy absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  );
}
