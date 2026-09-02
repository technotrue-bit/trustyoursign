import { useEffect, useRef } from "react";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { signArtImage, preloadSignArt, plateReady } from "@/lib/galaxy/signArt";
import { useGalaxy } from "@/lib/galaxy/store";
import {
  CRUISE,
  HOLD_FLY,
  MAX_FLY,
  aimedIndex,
  alongToGate,
  ensureAutoClock,
  ensureFlyInput,
  galaxyTravel,
  nearestSign,
  skipBirth,
  stepBirth,
  stepPlayUntil,
  stepSeek,
} from "@/lib/galaxy/travel";
import { useVault } from "@/lib/store";

export function FallbackSky() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    ensureAutoClock();
    ensureFlyInput();
    preloadSignArt();
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let vel = CRUISE;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const chatting = useVault.getState().chat;
      const entered = useVault.getState().entered;
      const birthing = !entered && galaxyTravel.birth < 1;
      if (stepBirth(dt)) useGalaxy.getState().markBorn();
      galaxyTravel.busy = chatting || entered || birthing;
      const hands = galaxyTravel.dragging || now < galaxyTravel.wheelUntil;
      galaxyTravel.handsOn = hands;
      const sought = stepSeek(galaxyTravel.t, dt);
      galaxyTravel.t = sought.t;
      const playing = stepPlayUntil(galaxyTravel.t);
      galaxyTravel.traveling = sought.active || playing;
      if (birthing) vel = 0;
      else if (chatting) vel *= Math.exp(-dt * 3.4);
      else if (hands || galaxyTravel.hold !== 0) {
        const want = galaxyTravel.hold !== 0 ? galaxyTravel.hold * HOLD_FLY : 0;
        if (want === 0) vel *= Math.exp(-dt * 2.6);
        else vel += (want - vel) * (1 - Math.exp(-dt * 4.2));
        vel = Math.max(-MAX_FLY, Math.min(MAX_FLY, vel));
        galaxyTravel.moved = true;
      } else vel += (CRUISE - vel) * (1 - Math.exp(-dt * 0.35));
      if (!birthing && !chatting && !entered) galaxyTravel.t += vel * dt;
      galaxyTravel.speed = vel;
      galaxyTravel.awaken = Math.min(1, Math.max(galaxyTravel.awaken, galaxyTravel.moved ? 1 : galaxyTravel.birth));
      useGalaxy.getState().setTravel(galaxyTravel.t, galaxyTravel.moved);

      const w = (canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1));
      const h = (canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1));
      ctx.fillStyle = "#0c0b0a";
      ctx.fillRect(0, 0, w, h);
      const t = galaxyTravel.t;
      const aim = aimedIndex(t);
      const near = nearestSign(t);
      for (let i = 0; i < 12; i++) {
        const along = alongToGate(t, i);
        const focused = i === aim || i === near;
        if (!focused && (along > 2.4 || along < -0.4)) continue;
        const sign = CONSTELLATIONS[i]!;
        const art = signArtImage(sign.id);
        const ready = plateReady(sign.id) && art.complete && art.naturalWidth > 2;
        if (!ready) continue;
        const z = Math.max(0.08, 0.12 + Math.min(Math.max(along, 0.05), 1.14) * 0.55);
        const aspect = art.naturalWidth / Math.max(1, art.naturalHeight);
        const aw = Math.min(w, h) * (0.92 / z) * 0.42;
        const ah = aw / aspect;
        ctx.save();
        ctx.globalAlpha = focused ? 0.95 : 0.55;
        ctx.drawImage(art, w / 2 - aw / 2, h / 2 - ah / 2 - 20, aw, ah);
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      className="canvas-root"
      onClick={() => {
        if (galaxyTravel.birth < 1) {
          skipBirth();
          useGalaxy.getState().markBorn();
        }
      }}
    />
  );
}
