/** Shared mutable travel. Written every frame by the camera. Not React state. */
import { CONSTELLATIONS, nearestSign, signStation, signedDelta, wrap12 } from "./constellations";
import { primeSignArt } from "./signArt";
import { useGalaxy } from "./store";

export { nearestSign, signStation, signedDelta, wrap12 };

export const BIRTH_SECONDS = 3.85;
export const CRUISE = 0.14;
export const MAX_FLY = 1.12;
export const HOLD_FLY = 0.58;
export const PLAY_CRUISE = 0.48;
export const SPACING = 50;
export const GATE = 0.55;
export const AUTO_SIGN = 7;
export const MORPH_FAR = 0.92;
export const MORPH_NEAR = 0.42;
export const GATHER_FAR = 2.55;
export const GATHER_LOCK = 1.12;
export const SEEK_ARRIVE = 0.55;
export const SEEK_THROUGH = 0.34;
const BIRTH_DT_CAP = 0.032;
const OPEN_T = -SEEK_ARRIVE;

let reduceCache = false;
let reduceAt = -1e9;
let autoClock = 0;
let autoLast = 0;
let flyBound = false;

export const galaxyTravel = {
  t: OPEN_T,
  moved: false,
  seek: null as number | null,
  playUntil: null as number | null,
  awaken: 0,
  speed: 0,
  birth: 0,
  ptrX: 0,
  ptrY: 0,
  ptrOn: false,
  idle: 0,
  idleAt: 0,
  handsOn: false,
  traveling: false,
  busy: false,
  hold: 0,
  steer: 0,
  dragging: false,
  wheelUntil: 0,
};

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - reduceAt > 800) {
    reduceAt = now;
    reduceCache = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return reduceCache;
}

function smooth01(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function restIdle() {
  galaxyTravel.idle = 0;
  galaxyTravel.idleAt = nowMs();
}

export function stepBirth(dt?: number) {
  if (galaxyTravel.birth >= 1) return false;
  if (prefersReducedMotion()) {
    galaxyTravel.birth = 1;
    return true;
  }
  const raw = typeof dt === "number" && Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
  const step = Math.min(raw, BIRTH_DT_CAP);
  const before = galaxyTravel.birth;
  galaxyTravel.birth = Math.min(1, galaxyTravel.birth + step / BIRTH_SECONDS);
  return before < 1 && galaxyTravel.birth >= 1;
}

export function skipBirth() {
  if (galaxyTravel.birth >= 1) return false;
  galaxyTravel.birth = 1;
  galaxyTravel.awaken = 1;
  restIdle();
  return true;
}

export function resetTravel(replayBirth: boolean) {
  galaxyTravel.t = OPEN_T;
  galaxyTravel.moved = false;
  galaxyTravel.seek = null;
  galaxyTravel.playUntil = null;
  galaxyTravel.awaken = replayBirth ? 0 : 1;
  galaxyTravel.speed = 0;
  galaxyTravel.birth = replayBirth ? 0 : 1;
  galaxyTravel.ptrOn = false;
  galaxyTravel.handsOn = false;
  galaxyTravel.traveling = false;
  galaxyTravel.busy = false;
  galaxyTravel.hold = 0;
  galaxyTravel.steer = 0;
  galaxyTravel.dragging = false;
  galaxyTravel.wheelUntil = 0;
  restIdle();
}

export function birthIgnite(b: number) {
  return smooth01(b / 0.2);
}

export function birthBoom(b: number) {
  if (b < 0.16 || b > 0.64) return 0;
  const x = (b - 0.36) * 6.4;
  return Math.exp(-(x * x));
}

export function starSpark(time: number, i: number, seed: number) {
  if (prefersReducedMotion()) return 1;
  const breathe = 0.96 + 0.04 * Math.sin(time * (0.85 + (i % 5) * 0.12) + seed + i * 0.71);
  const flash = Math.pow(0.5 + 0.5 * Math.sin(time * (1.7 + (i % 7) * 0.21) + seed * 1.3 + i * 2.05), 18);
  return breathe + flash * 0.2;
}

export function seekSign(index: number) {
  const i = ((Math.round(index) % 12) + 12) % 12;
  const station = signStation(i);
  galaxyTravel.seek = station - SEEK_ARRIVE;
  galaxyTravel.playUntil = null;
  galaxyTravel.moved = true;
  galaxyTravel.awaken = 1;
  const sign = CONSTELLATIONS[i];
  if (sign) primeSignArt(sign.id);
  const nxt = CONSTELLATIONS[(i + 1) % 12];
  if (nxt) primeSignArt(nxt.id);
  restIdle();
  useGalaxy.getState().setTravel(galaxyTravel.t, true);
  return i;
}

export function noteControl() {
  restIdle();
  galaxyTravel.playUntil = null;
}

export function nextSignIndex(t: number) {
  const i = Math.round(wrap12(t)) % 12;
  return (i + 1) % 12;
}

export function aimedIndex(t = galaxyTravel.t) {
  if (galaxyTravel.seek != null) return nearestSign(galaxyTravel.seek);
  return nearestSign(t);
}

export function alongToGate(t: number, index: number) {
  return signedDelta(t, index + GATE);
}

export function gateForm(along: number, index?: number, t?: number) {
  if (index != null && t != null) {
    const n = nearestSign(t);
    const nxt = (n + 1) % 12;
    const aim = aimedIndex(t);
    if (index !== n && index !== nxt && index !== aim) return 0;
    if (index === nxt && index !== aim && along < 0.35) return 0;
    if (index !== n && along < 0.22) return 0;
  }
  if (along > 2.85) return 0;
  if (along > 1.05) return smooth01((2.85 - along) / 1.8);
  if (along > 0.04) return 1;
  if (along > -0.62) return smooth01((along + 0.62) / 0.66);
  return 0;
}

export function signMorph(along: number) {
  if (prefersReducedMotion()) return along < 0.9 ? 1 : 0;
  if (along >= MORPH_FAR) return 0;
  if (along <= MORPH_NEAR) return 1;
  return smooth01((MORPH_FAR - along) / Math.max(0.08, MORPH_FAR - MORPH_NEAR));
}

export function morphBurst(along: number) {
  if (prefersReducedMotion()) return 0;
  if (along > MORPH_FAR || along < MORPH_NEAR) return 0;
  const mid = (MORPH_FAR + MORPH_NEAR) * 0.5;
  const x = (along - mid) / 0.14;
  return Math.exp(-(x * x));
}

export function starGather(along: number, i: number, n: number) {
  if (prefersReducedMotion()) return along < 1.7 ? 1 : 0;
  const lag = (i / Math.max(1, n)) * 0.46;
  const far = GATHER_FAR - lag * 0.14;
  const lock = GATHER_LOCK - lag * 0.18;
  if (along >= far) return 0;
  if (along <= lock) return 1;
  return smooth01((far - along) / Math.max(0.1, far - lock));
}

export function stepSeek(t: number, dt: number) {
  const dest = galaxyTravel.seek;
  if (dest == null) return { t, active: false };
  const gap = signedDelta(t, dest);
  const dist = Math.abs(gap);
  if (dist < 0.04) {
    galaxyTravel.seek = null;
    return { t: t + gap, active: false };
  }
  const rate = dist > 2.4 ? 2.6 : dist > 1.15 ? 0.92 : 0.34;
  const step = Math.sign(gap) * Math.min(dist, rate * dt);
  return { t: t + step, active: true };
}

export function stepPlayUntil(t: number) {
  const dest = galaxyTravel.playUntil;
  if (dest == null) return false;
  if (t >= dest) {
    galaxyTravel.playUntil = null;
    return false;
  }
  return true;
}

export function stepAutoSign(_dt: number, opts: { canAdvance: boolean; traveling?: boolean; handsOn?: boolean }) {
  if (!opts.canAdvance || opts.traveling || opts.handsOn) {
    restIdle();
    return false;
  }
  const now = nowMs();
  if (!galaxyTravel.idleAt) galaxyTravel.idleAt = now;
  galaxyTravel.idle = (now - galaxyTravel.idleAt) / 1000;
  if (galaxyTravel.idle < AUTO_SIGN) return false;
  restIdle();
  const i = nearestSign(galaxyTravel.t);
  const along = alongToGate(galaxyTravel.t, i);
  if (signMorph(along) < 0.45) {
    galaxyTravel.playUntil = signStation(i) + SEEK_THROUGH;
    galaxyTravel.moved = true;
    galaxyTravel.awaken = 1;
    return true;
  }
  seekSign(nextSignIndex(galaxyTravel.t));
  return true;
}

export function ensureAutoClock() {
  if (typeof window === "undefined" || autoClock) return;
  autoLast = nowMs();
  const tick = (now: number) => {
    autoClock = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - autoLast) / 1000);
    autoLast = now;
    if (!Number.isFinite(dt) || dt < 0) return;
    stepAutoSign(dt, {
      canAdvance: galaxyTravel.birth >= 1 && !galaxyTravel.busy,
      traveling: galaxyTravel.traveling || galaxyTravel.seek != null,
      handsOn: galaxyTravel.handsOn || galaxyTravel.dragging || now < galaxyTravel.wheelUntil,
    });
  };
  autoClock = requestAnimationFrame(tick);
}

function flyLocked() {
  return galaxyTravel.birth < 1 || galaxyTravel.busy;
}

function flyIgnore(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, a, input, textarea, select, .sign-strip, .birth-chat"));
}

function trackPtr(e: PointerEvent | WheelEvent) {
  if (!("clientX" in e)) return;
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  galaxyTravel.ptrX = Math.min(0.5, Math.max(-0.5, e.clientX / w - 0.5));
  galaxyTravel.ptrY = Math.min(0.5, Math.max(-0.5, e.clientY / h - 0.5));
  galaxyTravel.ptrOn = true;
}

export function ensureFlyInput() {
  if (typeof window === "undefined" || flyBound) return;
  flyBound = true;
  let lastY = 0;
  const onDown = (e: PointerEvent) => {
    if (flyLocked()) return;
    if (flyIgnore(e.target)) return;
    galaxyTravel.dragging = true;
    lastY = e.clientY;
    trackPtr(e);
    galaxyTravel.handsOn = true;
    if (e.button === 1) {
      e.preventDefault();
      galaxyTravel.hold = 1;
      galaxyTravel.moved = true;
      galaxyTravel.awaken = 1;
      noteControl();
    }
  };
  const onMove = (e: PointerEvent) => {
    trackPtr(e);
    if (!galaxyTravel.dragging) return;
    if (flyLocked()) return;
    const dy = e.clientY - lastY;
    lastY = e.clientY;
    if (Math.abs(dy) < 1) return;
    galaxyTravel.hold = dy > 0 ? 1 : -1;
    galaxyTravel.moved = true;
    galaxyTravel.awaken = 1;
    noteControl();
  };
  const onUp = () => {
    galaxyTravel.dragging = false;
    galaxyTravel.hold = 0;
    galaxyTravel.handsOn = false;
  };
  const onWheel = (e: WheelEvent) => {
    if (flyLocked()) return;
    if (flyIgnore(e.target)) return;
    e.preventDefault();
    const delta = e.deltaY;
    if (Math.abs(delta) < 0.2) return;
    galaxyTravel.hold = delta > 0 ? 1 : -1;
    galaxyTravel.moved = true;
    galaxyTravel.awaken = 1;
    galaxyTravel.wheelUntil = nowMs() + 180;
    noteControl();
  };
  window.addEventListener("pointerdown", onDown, { passive: false });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: false });
}
