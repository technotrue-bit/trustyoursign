import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  decideFrameGovernor,
  halfRateOpeningRender,
  type FrameGovernorMode,
  type HalfRateState,
} from "@/lib/galaxy/frameGovernor";
import { noteOpeningMs, openingHudWindowActive } from "@/lib/galaxy/openingProfile";
import { isSmallGpu } from "@/lib/gpu";
import { introPlaying } from "@/lib/galaxy/intro";
import { galaxyTravel } from "@/lib/galaxy/travel";

const INTERVAL_CAP = 180;

/**
 * Owns the sky canvas frameloop:
 * - `demand` when Pause + idle (invalidate on pointer/wheel/key/resize)
 * - no renders while `document.hidden`
 * - every-other-rAF on 120Hz panels that are missing vsync
 * - every other draw during the opening HUD window on a large desktop,
 *   a phone-sized canvas, or a small GPU. Full draws return after that window.
 *
 * Positive-priority `useFrame` takes over `gl.render` so simulation callbacks
 * at priority 0 still run every rAF for correct dt maths.
 */
export function FrameGovernor() {
  const { gl, scene, camera, size, invalidate, setFrameloop } = useThree();
  const intervals = useRef<number[]>([]);
  const last = useRef(0);
  const half = useRef<HalfRateState>({ active: false, sinceMs: 0 });
  const mode = useRef<FrameGovernorMode>("always");
  const everyNth = useRef<1 | 2>(1);
  const tick = useRef(0);
  const hidden = useRef(false);

  useEffect(() => {
    const onVis = () => {
      hidden.current = document.visibilityState === "hidden";
      if (!hidden.current) {
        last.current = 0;
        invalidate();
      }
    };
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [invalidate]);

  useEffect(() => {
    const bump = () => {
      if (mode.current === "demand") invalidate();
    };
    const opts = { passive: true, capture: true } as const;
    window.addEventListener("pointerdown", bump, opts);
    window.addEventListener("pointermove", bump, opts);
    window.addEventListener("wheel", bump, opts);
    window.addEventListener("keydown", bump, opts);
    window.addEventListener("resize", bump, opts);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", bump);
    vv?.addEventListener("scroll", bump);
    return () => {
      window.removeEventListener("pointerdown", bump, opts);
      window.removeEventListener("pointermove", bump, opts);
      window.removeEventListener("wheel", bump, opts);
      window.removeEventListener("keydown", bump, opts);
      window.removeEventListener("resize", bump, opts);
      vv?.removeEventListener("resize", bump);
      vv?.removeEventListener("scroll", bump);
    };
  }, [invalidate]);

  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000;
    if (last.current > 0) {
      const dt = now - last.current;
      if (dt > 0 && dt < 250) {
        const arr = intervals.current;
        arr.push(dt);
        if (arr.length > INTERVAL_CAP) arr.splice(0, arr.length - INTERVAL_CAP);
      }
    }
    last.current = now;

    const decision = decideFrameGovernor(
      {
        paused: galaxyTravel.paused,
        handsOn: galaxyTravel.handsOn || galaxyTravel.dragging,
        traveling: galaxyTravel.traveling,
        seeking: galaxyTravel.seek != null,
        introPlaying: introPlaying(),
        documentHidden: hidden.current,
        intervalsMs: intervals.current,
      },
      half.current,
      now,
    );
    half.current = decision.halfRate;
    everyNth.current = decision.renderEveryNth;

    if (decision.mode !== mode.current) {
      mode.current = decision.mode;
      setFrameloop(decision.mode);
      if (decision.mode === "demand") invalidate();
    }

    if (hidden.current) return;

    tick.current += 1;
    const introHalfRender = halfRateOpeningRender({
      openingHud: openingHudWindowActive(),
      width: size.width,
      height: size.height,
      smallGpu: isSmallGpu(),
    });
    const renderNth = introHalfRender ? 2 : everyNth.current;
    if (tick.current % renderNth !== 0) return;
    const r0 = import.meta.env.DEV ? performance.now() : 0;
    gl.render(scene, camera);
    if (import.meta.env.DEV) noteOpeningMs("webglRender", performance.now() - r0);
  }, 1);

  return null;
}
