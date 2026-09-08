/** Shared mutable travel. Written every frame by the camera. Not React state. */
import { CONSTELLATIONS, nearestSign, signStation, signedDelta, wrap12 } from "./constellations";
import { primeSignArt } from "./signArt";
import {
  enterDive,
  enterGalaxyForm,
  enterPlateFade,
  enterWorldFade,
  getSignGalaxy,
  type ExplorePhase,
} from "./signGalaxy";
import { useGalaxy, currentConstellation } from "./store";
import { clamp01, stationFromT, stationT } from "./temple";
import { introPlaying, skipIntro, introCanSkip } from "./intro";

export { signedDelta, wrap12 };
export type { ExplorePhase };
export type EnterSkipPhase = "idle" | "out" | "hold" | "in";

/** Seconds for the full enter morph (fade → dive → galaxy form). */
const ENTER_SEC = 4.5;
const EXIT_SEC = 1.55;
const SKIP_OUT = 0.42;
const SKIP_HOLD = 0.2;
const SKIP_IN = 0.48;
const SKIP_OUT_RM = 0.18;
const SKIP_HOLD_RM = 0.1;
const SKIP_IN_RM = 0.22;

export const BIRTH_SECONDS = 3.85;
/** Idle drift toward you. Keep this low — the sky should feel patient. */
export const CRUISE = 0.14;
/** After a jump, ease through animal → explosion → glyph. Patient so the stars can gather. */
export const PLAY_CRUISE = 0.48;
/** Slide or hold the sky to fly — medium, same both ways. */
export const HOLD_FLY = 0.58;
export const MAX_FLY = 1.12;
/** World units along −Z per t. Signs sit farther apart so the burst can read. */
export const SPACING = 50;
/** Sign sits this far ahead of its station. You still fly through it while its name is up. */
export const GATE = 0.55;
/** Hands off: dwell, then walk to the next sign. */
export const AUTO_SIGN = 7;
/** Animal holds until this along. */
export const MORPH_FAR = 0.92;
/** Glyph is complete by this along — middle of the remaining approach. */
export const MORPH_NEAR = 0.42;
/** Stars are still out in the field. */
export const GATHER_FAR = 2.55;
/** Stars have locked into the picture. */
export const GATHER_LOCK = 1.12;
/** Land this far before the station so the ram is still a ram. */
export const SEEK_ARRIVE = 0.55;
/** Cruise this far past the station so the explosion finishes, then the glyph passes. */
export const SEEK_THROUGH = 0.34;
/** Never skip more than ~2 frames of birth, even after a load hitch. */
const BIRTH_DT_CAP = 0.032;
/** Strip click: fly straight to the sign without station-hopping. */
const DIRECT_SEEK_SEC = 0.85;
/** After a sign click/select, hold the highlight this long before clearing. */
export const SELECTION_HOLD_MS = 10_000;
/** First look starts on the ram, before the Aries station. */
export const OPEN_T = 0;

let reduceCache = false;
let reduceAt = -1e9;
let autoClock = 0;
let autoLast = 0;
let enterSkipWatchdog = 0;

export const galaxyTravel = {
  t: OPEN_T,
  /** Damped camera follows this. Scroll and seek write here. Clamped 0–1. */
  tTarget: OPEN_T,
  moved: false,
  /** ms left on the post-select hold; null when no countdown is armed. */
  selectionHoldLeft: null as number | null,
  /** performance.now() when selectionHoldLeft was last sampled. */
  selectionHoldAt: 0,
  seek: null as number | null,
  /** Keep flying until this t so a jump plays animal → burst → glyph. */
  playUntil: null as number | null,
  awaken: 0,
  /** World-units per second along the flight path. */
  speed: 0,
  /** 0 → 1 first-load star birth. 1 means the sky is open. */
  birth: 0,
  /** Pointer in view, −0.5…0.5. */
  ptrX: 0,
  ptrY: 0,
  ptrOn: false,
  /** Seconds since the last steering input. Shared by 2D and 3D. */
  idle: 0,
  /** performance.now() when idle began. Wall-clock so a paused renderer still counts. */
  idleAt: 0,
  /** True while the pointer is dragging the sky. */
  handsOn: false,
  /** True while a seek is interpolating. */
  traveling: false,
  /** Chat, vault, or still birthing — don't auto-walk. */
  busy: false,
  /** −1 reverse, 0 none, +1 forward. Held while a finger or the wheel is down. */
  hold: 0,
  /** Impulse consumed once per frame by the camera. */
  steer: 0,
  /** Pointer still down on the sky. */
  dragging: false,
  /** performance.now() until a wheel flick still counts as hands-on. */
  wheelUntil: 0,
  /** Bumped on reset so the camera rig snaps instead of keeping stale t. */
  epoch: 0,
  /** 1 = rest hero. >1 pulls into the current sign. Pinch on mobile. */
  zoom: 1,
  zoomTarget: 1,
  /** Strip click — ease camera without stepping signIndex through intermediates. */
  seekDirect: false,
  seekTargetIndex: null as number | null,
  seekStartT: null as number | null,
  seekElapsed: 0,
  /** Per-sign galaxy explore — nested inside a corridor station. */
  explorePhase: "idle" as ExplorePhase,
  exploreSignIndex: null as number | null,
  exploreProgress: 0,
  enterSkip: "idle" as EnterSkipPhase,
  enterSkipElapsed: 0,
  skipVeil: 0,
  worldFade: 1,
  plateFade: 1,
  galaxyForm: 0,
  diveBlend: 0,
  pointIndex: 0,
  pointSeek: null as number | null,
  pointT: 0,
  pointTTarget: 0,
  /** Non-hub stars seekable after full chart + profile for this sign. */
  starsUnlocked: false,
  /** Pulse once when enter lands on hub — UI may open birth claim. */
  claimPrompt: false,
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

let pinchQuietUntil = 0;
export function pinchQuiet() {
  return nowMs() < pinchQuietUntil;
}

function restIdle() {
  galaxyTravel.idle = 0;
  galaxyTravel.idleAt = nowMs();
}

/** Advance the opening birth one display frame. Capped so a hitch never jumps the boom. */
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
  galaxyTravel.birth = 1;
  galaxyTravel.awaken = 1;
  restIdle();
  skipIntro();
  return true;
}

export function resetTravel(replayBirth: boolean) {
  galaxyTravel.t = OPEN_T;
  galaxyTravel.tTarget = OPEN_T;
  galaxyTravel.moved = false;
  galaxyTravel.selectionHoldLeft = null;
  galaxyTravel.selectionHoldAt = 0;
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
  galaxyTravel.epoch += 1;
  galaxyTravel.zoom = 1;
  galaxyTravel.zoomTarget = 1;
  galaxyTravel.seekDirect = false;
  galaxyTravel.seekTargetIndex = null;
  galaxyTravel.seekStartT = null;
  galaxyTravel.seekElapsed = 0;
  resetExplore(false);
  restIdle();
}

/** Start / refresh the 10s post-select countdown (silent — no UI). */
export function armSelectionHold() {
  galaxyTravel.selectionHoldLeft = SELECTION_HOLD_MS;
  galaxyTravel.selectionHoldAt = nowMs();
}

/** Drop the selected-sign highlight and cancel any hold timer. */
export function clearSignSelection() {
  galaxyTravel.selectionHoldLeft = null;
  galaxyTravel.selectionHoldAt = 0;
  if (!galaxyTravel.moved) return;
  galaxyTravel.moved = false;
  publishTravel(galaxyTravel.t, false);
}

/**
 * Tick the post-select hold. Pauses while claim/vault is busy, exploring, or intro plays.
 * Safe to call from the shared auto clock and the sky/camera frames.
 */
export function stepSelectionHold() {
  if (galaxyTravel.selectionHoldLeft == null) return;
  if (!galaxyTravel.moved) {
    galaxyTravel.selectionHoldLeft = null;
    return;
  }
  const now = nowMs();
  if (galaxyTravel.busy || exploringSign() || introPlaying()) {
    galaxyTravel.selectionHoldAt = now;
    return;
  }
  const elapsed = now - (galaxyTravel.selectionHoldAt || now);
  galaxyTravel.selectionHoldAt = now;
  if (elapsed > 0) {
    galaxyTravel.selectionHoldLeft = Math.max(0, galaxyTravel.selectionHoldLeft - elapsed);
  }
  if (galaxyTravel.selectionHoldLeft <= 0) clearSignSelection();
}

function publishExplore() {
  useGalaxy.getState().setExplore({
    phase: galaxyTravel.explorePhase,
    signIndex: galaxyTravel.exploreSignIndex,
    progress: galaxyTravel.exploreProgress,
    skipPhase: galaxyTravel.enterSkip,
    skipVeil: galaxyTravel.skipVeil,
    worldFade: galaxyTravel.worldFade,
    plateFade: galaxyTravel.plateFade,
    galaxyForm: galaxyTravel.galaxyForm,
    pointIndex: galaxyTravel.pointIndex,
  });
}

function applyEnterCurves(p: number) {
  galaxyTravel.exploreProgress = clamp01(p);
  galaxyTravel.worldFade = enterWorldFade(p);
  galaxyTravel.plateFade = enterPlateFade(p);
  galaxyTravel.galaxyForm = enterGalaxyForm(p);
  galaxyTravel.diveBlend = enterDive(p);
}

function skipDurations() {
  return prefersReducedMotion()
    ? { out: SKIP_OUT_RM, hold: SKIP_HOLD_RM, in: SKIP_IN_RM }
    : { out: SKIP_OUT, hold: SKIP_HOLD, in: SKIP_IN };
}

function clearEnterSkip() {
  enterSkipWatchdog += 1;
  galaxyTravel.enterSkip = "idle";
  galaxyTravel.enterSkipElapsed = 0;
  galaxyTravel.skipVeil = 0;
}

export function resetExplore(publish = true) {
  galaxyTravel.explorePhase = "idle";
  galaxyTravel.exploreSignIndex = null;
  galaxyTravel.exploreProgress = 0;
  clearEnterSkip();
  galaxyTravel.worldFade = 1;
  galaxyTravel.plateFade = 1;
  galaxyTravel.galaxyForm = 0;
  galaxyTravel.diveBlend = 0;
  galaxyTravel.pointIndex = 0;
  galaxyTravel.pointSeek = null;
  galaxyTravel.pointT = 0;
  galaxyTravel.pointTTarget = 0;
  galaxyTravel.starsUnlocked = false;
  galaxyTravel.claimPrompt = false;
  if (publish) publishExplore();
}

/** True while a sign galaxy is entering, active, or exiting. */
export function exploringSign() {
  return galaxyTravel.explorePhase !== "idle";
}

export function insideSignGalaxy() {
  return galaxyTravel.explorePhase === "inside";
}

/** True while the enter dive is playing — screen should stay locked. */
export function enterAnimating() {
  if (galaxyTravel.enterSkip !== "idle") return true;
  const p = galaxyTravel.explorePhase;
  return p === "fading" || p === "diving";
}

function landInsideHub() {
  applyEnterCurves(1);
  galaxyTravel.explorePhase = "inside";
  galaxyTravel.exploreProgress = 1;
  galaxyTravel.pointIndex = 0;
  galaxyTravel.pointSeek = null;
  galaxyTravel.pointT = 0;
  galaxyTravel.pointTTarget = 0;
  galaxyTravel.claimPrompt = true;
  galaxyTravel.hold = 0;
  galaxyTravel.steer = 0;
  publishExplore();
}

/**
 * Skip the enter dive and land on the first star (hub), same destination
 * as letting the animation finish.
 */
export function skipEnterGalaxy() {
  if (galaxyTravel.enterSkip !== "idle") return false;
  if (!(galaxyTravel.explorePhase === "fading" || galaxyTravel.explorePhase === "diving")) {
    return false;
  }
  galaxyTravel.enterSkip = "out";
  galaxyTravel.enterSkipElapsed = 0;
  noteControl();
  publishExplore();
  if (typeof window !== "undefined") {
    const token = ++enterSkipWatchdog;
    const d = skipDurations();
    window.setTimeout(() => {
      if (token === enterSkipWatchdog) recoverStalledEnterSkip();
    }, (d.out + d.hold + d.in) * 1000 + 250);
  }
  return true;
}

/** Finish a Skip whose render clock stopped, leaving the hub unlocked and veil clear. */
export function recoverStalledEnterSkip() {
  if (galaxyTravel.enterSkip === "idle") return false;
  if (galaxyTravel.explorePhase !== "inside") landInsideHub();
  clearEnterSkip();
  publishExplore();
  return true;
}

/**
 * Begin the selected-sign dive: fade the world, approach the animal form,
 * dissolve the plate, and bloom stars into a per-sign galaxy.
 */
export function enterSignGalaxy(index?: number) {
  if (introPlaying()) return false;
  if (galaxyTravel.birth < 1) return false;
  if (exploringSign()) return false;
  const i =
    index != null
      ? ((Math.round(index) % 12) + 12) % 12
      : galaxyTravel.seekDirect && galaxyTravel.seekTargetIndex != null
        ? galaxyTravel.seekTargetIndex
        : stationFromT(galaxyTravel.t);
  const sign = CONSTELLATIONS[i];
  if (!sign) return false;
  seekSign(i, { direct: true });
  galaxyTravel.explorePhase = "fading";
  galaxyTravel.exploreSignIndex = i;
  galaxyTravel.exploreProgress = 0;
  galaxyTravel.pointIndex = 0;
  galaxyTravel.pointSeek = null;
  galaxyTravel.pointT = 0;
  galaxyTravel.pointTTarget = 0;
  galaxyTravel.hold = 0;
  galaxyTravel.steer = 0;
  galaxyTravel.zoomTarget = 1.35;
  galaxyTravel.starsUnlocked = false;
  galaxyTravel.claimPrompt = false;
  applyEnterCurves(0);
  primeSignArt(sign.id);
  getSignGalaxy(sign.id);
  noteControl();
  publishExplore();
  return true;
}

/** Leave the sign galaxy and restore the corridor. */
export function exitSignGalaxy() {
  if (!exploringSign()) return false;
  // Keep the enter dive whole — only Skip can jump to the hub mid-animation.
  if (enterAnimating()) return false;
  if (galaxyTravel.explorePhase === "exiting") return true;
  galaxyTravel.explorePhase = "exiting";
  galaxyTravel.pointSeek = null;
  galaxyTravel.zoomTarget = 1;
  noteControl();
  publishExplore();
  return true;
}

export function setExploreStarsUnlocked(unlocked: boolean) {
  galaxyTravel.starsUnlocked = Boolean(unlocked);
}

export function consumeClaimPrompt() {
  if (!galaxyTravel.claimPrompt) return false;
  galaxyTravel.claimPrompt = false;
  return true;
}

export function seekGalaxyPoint(pointIndex: number) {
  if (!insideSignGalaxy() || galaxyTravel.exploreSignIndex == null) return false;
  const galaxy = getSignGalaxy(CONSTELLATIONS[galaxyTravel.exploreSignIndex]!.id);
  if (galaxy.points.length === 0) return false;
  const i = ((Math.round(pointIndex) % galaxy.points.length) + galaxy.points.length) % galaxy.points.length;
  const point = galaxy.points[i]!;
  if (!point.isHub && !galaxyTravel.starsUnlocked) return false;
  galaxyTravel.pointSeek = i;
  galaxyTravel.pointTTarget = i;
  galaxyTravel.pointIndex = i;
  noteControl();
  publishExplore();
  return true;
}

function stepEnterSkip(dt: number) {
  const d = skipDurations();
  galaxyTravel.enterSkipElapsed += dt;
  const phase = galaxyTravel.enterSkip;
  if (phase === "out") {
    const u = Math.min(1, galaxyTravel.enterSkipElapsed / d.out);
    galaxyTravel.skipVeil = smooth01(u);
    if (u >= 1) {
      galaxyTravel.enterSkip = "hold";
      galaxyTravel.enterSkipElapsed = 0;
      galaxyTravel.skipVeil = 1;
      landInsideHub();
    }
    publishExplore();
    return;
  }
  if (phase === "hold") {
    galaxyTravel.skipVeil = 1;
    if (galaxyTravel.enterSkipElapsed >= d.hold) {
      galaxyTravel.enterSkip = "in";
      galaxyTravel.enterSkipElapsed = 0;
    }
    publishExplore();
    return;
  }
  if (phase === "in") {
    const u = Math.min(1, galaxyTravel.enterSkipElapsed / d.in);
    galaxyTravel.skipVeil = 1 - smooth01(u);
    if (u >= 1) clearEnterSkip();
    publishExplore();
  }
}

export function stepExplore(dt: number) {
  if (galaxyTravel.enterSkip !== "idle") {
    stepEnterSkip(dt);
    return;
  }
  const phase = galaxyTravel.explorePhase;
  if (phase === "idle") return;

  if (phase === "exiting") {
    const p = galaxyTravel.exploreProgress - dt / (prefersReducedMotion() ? 0.35 : EXIT_SEC);
    if (p <= 0.001) {
      resetExplore(true);
      return;
    }
    applyEnterCurves(p);
    publishExplore();
    return;
  }

  if (phase === "inside") {
    if (galaxyTravel.pointSeek != null) {
      const k = 1 - Math.exp(-dt * 2.4);
      galaxyTravel.pointT += (galaxyTravel.pointTTarget - galaxyTravel.pointT) * k;
      if (Math.abs(galaxyTravel.pointT - galaxyTravel.pointTTarget) < 0.02) {
        galaxyTravel.pointT = galaxyTravel.pointTTarget;
        galaxyTravel.pointIndex = galaxyTravel.pointSeek;
        galaxyTravel.pointSeek = null;
        publishExplore();
      }
    }
    return;
  }

  // fading → diving → inside
  const rate = prefersReducedMotion() ? 0.7 : ENTER_SEC;
  const next = Math.min(1, galaxyTravel.exploreProgress + dt / rate);
  applyEnterCurves(next);
  if (next < 0.28) galaxyTravel.explorePhase = "fading";
  else if (next < 0.98) galaxyTravel.explorePhase = "diving";
  else {
    landInsideHub();
    return;
  }
  publishExplore();
}

/** Seed light of the opening — slow ease into the first glow. */
export function birthIgnite(b: number) {
  return smooth01(b / 0.2);
}

/** Wide flash so the boom lasts many frames instead of a single pop. */
export function birthBoom(b: number) {
  if (b < 0.16 || b > 0.64) return 0;
  const x = (b - 0.36) * 6.4;
  return Math.exp(-(x * x));
}

/** Soft twinkle for a constellation star. Occasional bright tick, otherwise a slow breathe. */
export function starSpark(time: number, i: number, seed: number) {
  if (prefersReducedMotion()) return 1;
  const breathe = 0.96 + 0.04 * Math.sin(time * (0.85 + (i % 5) * 0.12) + seed + i * 0.71);
  const flash = Math.pow(0.5 + 0.5 * Math.sin(time * (1.7 + (i % 7) * 0.21) + seed * 1.3 + i * 2.05), 18);
  return breathe + flash * 0.2;
}

export type SeekOptions = { direct?: boolean; auto?: boolean };

function clearDirectSeek() {
  galaxyTravel.seekDirect = false;
  galaxyTravel.seekTargetIndex = null;
  galaxyTravel.seekStartT = null;
  galaxyTravel.seekElapsed = 0;
}

/** Jump the flight path to a sign. Arrive as the animal and hold until they fly or rest. */
export function seekSign(index: number, opts?: SeekOptions) {
  if (enterAnimating()) return galaxyTravel.exploreSignIndex ?? 0;
  if (exploringSign() && galaxyTravel.explorePhase !== "fading") {
    // Strip / external seek leaves an open galaxy first.
    if (galaxyTravel.exploreSignIndex !== ((Math.round(index) % 12) + 12) % 12) {
      resetExplore(true);
    }
  }
  const i = ((Math.round(index) % 12) + 12) % 12;
  const dest = stationT(i);
  const direct = opts?.direct ?? false;
  const select = !opts?.auto;
  galaxyTravel.seek = dest;
  galaxyTravel.tTarget = dest;
  galaxyTravel.playUntil = null;
  if (select) {
    galaxyTravel.moved = true;
    galaxyTravel.awaken = 1;
  }
  if (direct) {
    galaxyTravel.seekDirect = true;
    galaxyTravel.seekTargetIndex = i;
    galaxyTravel.seekStartT = galaxyTravel.t;
    galaxyTravel.seekElapsed = 0;
  } else {
    clearDirectSeek();
  }
  const sign = CONSTELLATIONS[i];
  if (sign) primeSignArt(sign.id);
  const nxt = CONSTELLATIONS[(i + 1) % 12];
  if (nxt) primeSignArt(nxt.id);
  const prev = CONSTELLATIONS[(i + 11) % 12];
  if (prev) primeSignArt(prev.id);
  restIdle();
  publishTravel(dest, select ? true : undefined);
  if (select) armSelectionHold();
  primeSignArt(currentConstellation().id);
  return i;
}

/** Publish camera t to React — during a direct seek, signIndex stays on the target. */
export function publishTravel(t: number, moved?: boolean) {
  const override =
    galaxyTravel.seekDirect && galaxyTravel.seek != null ? galaxyTravel.seekTargetIndex : undefined;
  useGalaxy.getState().setTravel(t, moved, override ?? undefined);
}

/** Hands on the sky — don't auto-advance until they let go. */
export function noteControl() {
  restIdle();
  galaxyTravel.playUntil = null;
}

function flyLocked() {
  return (galaxyTravel.birth >= 1 && galaxyTravel.busy) || exploringSign();
}

function flyIgnore(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("button, a, input, textarea, select, .sign-strip, .birth-chat, .gloss-card, [data-no-fly]"),
  );
}

function trackPtr(e: PointerEvent) {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  galaxyTravel.ptrX = Math.min(0.5, Math.max(-0.5, e.clientX / w - 0.5));
  galaxyTravel.ptrY = Math.min(0.5, Math.max(-0.5, e.clientY / h - 0.5));
  galaxyTravel.ptrOn = true;
}

/** Finger down → forward, finger up → back. Same for a mouse drag. */
export function applyFlyDelta(dy: number, dx = 0, touch = false) {
  if (introPlaying()) {
    if (introCanSkip()) skipIntro();
    return;
  }
  if (flyLocked()) return;
  if (galaxyTravel.birth < 1) {
    if (Math.abs(dy) + Math.abs(dx) > 8) skipBirth();
    return;
  }
  const feel = touch ? 1.7 : 1;
  galaxyTravel.steer += (dy / 420 - dx / 720) * feel;
  galaxyTravel.tTarget = clamp01(galaxyTravel.tTarget + (dy * feel) / 2200 - (dx * feel) / 3800);
  if (Math.abs(dy) > 2) galaxyTravel.hold = dy > 0 ? 1 : -1;
  galaxyTravel.moved = true;
  galaxyTravel.awaken = 1;
  noteControl();
}

export function applyWheel(deltaY: number, deltaX = 0, deltaMode = 0) {
  if (introPlaying()) {
    if (introCanSkip()) skipIntro();
    return;
  }
  if (flyLocked()) return;
  const scale = deltaMode === 1 ? 16 : deltaMode === 2 ? 120 : 1;
  const impulse = (deltaY * scale + deltaX * scale * 0.45) / 900;
  if (galaxyTravel.birth < 1) {
    skipBirth();
    return;
  }
  galaxyTravel.steer += impulse;
  galaxyTravel.tTarget = clamp01(galaxyTravel.tTarget + impulse * 0.085);
  if (Math.abs(impulse) > 0.002) galaxyTravel.hold = impulse > 0 ? 1 : -1;
  galaxyTravel.wheelUntil = nowMs() + 220;
  galaxyTravel.moved = true;
  galaxyTravel.awaken = 1;
  noteControl();
}

export function applyPinch(ratio: number) {
  if (introPlaying()) {
    if (introCanSkip()) skipIntro();
    return;
  }
  if (flyLocked()) return;
  if (!Number.isFinite(ratio) || ratio <= 0) return;
  const next = galaxyTravel.zoomTarget * ratio;
  galaxyTravel.zoomTarget = Math.min(2.7, Math.max(1, next));
  galaxyTravel.handsOn = true;
  galaxyTravel.awaken = 1;
  pinchQuietUntil = nowMs() + 420;
  noteControl();
}

export function stepZoom(dt: number, stationChanged: boolean) {
  if (stationChanged) galaxyTravel.zoomTarget = 1;
  const k = 1 - Math.exp(-dt * 10);
  galaxyTravel.zoom += (galaxyTravel.zoomTarget - galaxyTravel.zoom) * k;
}

export function endFly() {
  galaxyTravel.dragging = false;
  galaxyTravel.hold = 0;
  galaxyTravel.handsOn = nowMs() < galaxyTravel.wheelUntil;
}

/** Slide the sky, pinch the sign, scroll the wheel. One winner per gesture. */
let flyBound = false;
export function ensureFlyInput() {
  if (typeof window === "undefined" || flyBound) return;
  flyBound = true;

  const SLOP = 12;
  const pts = new Map<number, { x: number; y: number }>();
  let mode: "none" | "pending" | "fly" | "pinch" = "none";
  let lastX = 0;
  let lastY = 0;
  let originX = 0;
  let originY = 0;
  let pid = -1;
  let pinchDist = 0;
  let leftoverLock = false;

  const span = () => {
    if (pts.size < 2) return 0;
    const [a, b] = [...pts.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const beginPinch = () => {
    mode = "pinch";
    leftoverLock = true;
    pinchDist = span();
    galaxyTravel.dragging = false;
    galaxyTravel.hold = 0;
    galaxyTravel.steer = 0;
  };

  const clearIfIdle = () => {
    if (pts.size === 0) {
      mode = "none";
      leftoverLock = false;
      pinchDist = 0;
      pid = -1;
      endFly();
    }
  };

  const onDown = (e: PointerEvent) => {
    if (flyIgnore(e.target)) return;
    if (introPlaying()) {
      if (introCanSkip()) skipIntro();
      if (e.pointerType !== "mouse") e.preventDefault();
      return;
    }
    if (flyLocked()) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) {
      beginPinch();
      if (e.pointerType !== "mouse") e.preventDefault();
      return;
    }
    if (leftoverLock) {
      if (e.pointerType !== "mouse") e.preventDefault();
      return;
    }
    mode = "pending";
    pid = e.pointerId;
    originX = lastX = e.clientX;
    originY = lastY = e.clientY;
    trackPtr(e);
    galaxyTravel.handsOn = true;
    if (e.pointerType !== "mouse") e.preventDefault();
    if (e.button === 1) {
      e.preventDefault();
      mode = "fly";
      galaxyTravel.dragging = true;
      galaxyTravel.hold = 1;
      galaxyTravel.moved = true;
      galaxyTravel.awaken = 1;
      noteControl();
    }
  };

  const onMove = (e: PointerEvent) => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === "pinch" && pts.size >= 2) {
      const d = span();
      if (pinchDist > 10 && d > 10) {
        const ratio = d / pinchDist;
        if (Math.abs(ratio - 1) > 0.006) applyPinch(ratio);
      }
      pinchDist = d || pinchDist;
      if (e.pointerType !== "mouse") e.preventDefault();
      return;
    }
    if (leftoverLock || mode === "pinch") return;
    trackPtr(e);
    if (e.pointerId !== pid) return;
    if (mode === "pending") {
      const dist = Math.hypot(e.clientX - originX, e.clientY - originY);
      if (dist < SLOP) return;
      mode = "fly";
      galaxyTravel.dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
    if (mode !== "fly") return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    applyFlyDelta(dy, dx, e.pointerType !== "mouse");
  };

  const onUp = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (mode === "pinch") {
      if (pts.size < 2) pinchDist = 0;
      if (pts.size === 0) clearIfIdle();
      return;
    }
    if (e.pointerId !== pid && pid !== -1) {
      clearIfIdle();
      return;
    }
    pid = -1;
    if (e.pointerType !== "mouse") galaxyTravel.ptrOn = false;
    clearIfIdle();
  };

  const onWheel = (e: WheelEvent) => {
    if (flyLocked()) return;
    if (flyIgnore(e.target)) return;
    e.preventDefault();
    if (mode === "pinch" || leftoverLock) return;
    if (e.ctrlKey || e.metaKey) {
      const r = Math.exp(-e.deltaY * 0.008);
      applyPinch(r);
      return;
    }
    applyWheel(e.deltaY, e.deltaX, e.deltaMode);
    galaxyTravel.handsOn = true;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (flyIgnore(e.target)) return;
    if (e.touches.length < 2) return;
    if (introPlaying() || flyLocked()) return;
    e.preventDefault();
    const a = e.touches[0]!;
    const b = e.touches[1]!;
    pts.set(-1, { x: a.clientX, y: a.clientY });
    pts.set(-2, { x: b.clientX, y: b.clientY });
    if (mode !== "pinch") beginPinch();
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinchDist > 10 && d > 10) {
      const ratio = d / pinchDist;
      if (Math.abs(ratio - 1) > 0.006) applyPinch(ratio);
    }
    pinchDist = d;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      pts.delete(-1);
      pts.delete(-2);
      if (mode === "pinch") clearIfIdle();
    }
  };

  const onGesture = (e: Event) => e.preventDefault();

  window.addEventListener("pointerdown", onDown, { capture: true, passive: false });
  window.addEventListener("pointermove", onMove, { capture: true, passive: false });
  window.addEventListener("pointerup", onUp, { capture: true, passive: true });
  window.addEventListener("pointercancel", onUp, { capture: true, passive: true });
  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  window.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
  window.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true });
  window.addEventListener("gesturestart", onGesture, { capture: true, passive: false });
  window.addEventListener("gesturechange", onGesture, { capture: true, passive: false });
}


function finishSeek(dest: number) {
  galaxyTravel.seek = null;
  galaxyTravel.tTarget = dest;
  clearDirectSeek();
}

/** Cruise toward a strip jump. Fly through the sky — never teleport into a blank. */
export function stepSeek(t: number, dt: number) {
  const dest = galaxyTravel.seek;
  if (dest == null) return { t, active: false };
  if (galaxyTravel.seekDirect) {
    const start = galaxyTravel.seekStartT ?? t;
    galaxyTravel.seekElapsed += dt;
    const duration = prefersReducedMotion() ? 0.01 : DIRECT_SEEK_SEC;
    const u = smooth01(Math.min(1, galaxyTravel.seekElapsed / duration));
    const next = start + (dest - start) * u;
    if (u >= 1 || Math.abs(dest - next) < 0.004) {
      finishSeek(dest);
      return { t: dest, active: false };
    }
    return { t: next, active: true };
  }
  const gap = dest - t;
  const dist = Math.abs(gap);
  if (dist < 0.004) {
    finishSeek(dest);
    return { t: dest, active: false };
  }
  const k = dist > 0.22 ? 2.1 : dist > 0.08 ? 3.4 : 5.2;
  const u = 1 - Math.exp(-dt * k);
  return { t: t + gap * u, active: true };
}

/** Sign the camera should be showing — the seek target, else whoever owns this stretch of sky. */
export function aimedIndex(t = galaxyTravel.t) {
  if (galaxyTravel.seek != null) return stationFromT(galaxyTravel.seek);
  return stationFromT(t);
}

export function nextSignIndex(t: number) {
  return Math.min(11, stationFromT(t) + 1);
}

/** True while a jump is still playing animal → burst → glyph. */
export function stepPlayUntil(t: number) {
  const dest = galaxyTravel.playUntil;
  if (dest == null) return false;
  if (signedDelta(t, dest) <= 0.03) {
    galaxyTravel.playUntil = null;
    return false;
  }
  return true;
}

/** Dwell, then seek the next sign. Safe to call from more than one loop — uses wall-clock. */
export function stepAutoSign(
  _dt: number,
  opts: { canAdvance: boolean; traveling?: boolean; handsOn?: boolean },
) {
  if (!opts.canAdvance || opts.traveling || opts.handsOn) {
    restIdle();
    return false;
  }
  // Don't hop while a clicked sign is still held — that was re-arming the 10s timer.
  if (galaxyTravel.selectionHoldLeft != null) {
    restIdle();
    return false;
  }
  const now = nowMs();
  if (!galaxyTravel.idleAt) galaxyTravel.idleAt = now;
  galaxyTravel.idle = (now - galaxyTravel.idleAt) / 1000;
  if (galaxyTravel.idle < AUTO_SIGN) return false;
  restIdle();
  const i = stationFromT(galaxyTravel.t);
  if (i >= 11) return false;
  seekSign(i + 1, { auto: true });
  return true;
}

/** Own rAF so the 7s walk keeps time even while the canvas is booting. */
export function ensureAutoClock() {
  if (typeof window === "undefined" || autoClock) return;
  autoLast = nowMs();
  const tick = (now: number) => {
    autoClock = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - autoLast) / 1000);
    autoLast = now;
    if (!Number.isFinite(dt) || dt < 0) return;
    stepSelectionHold();
    stepAutoSign(dt, {
      canAdvance: galaxyTravel.birth >= 1 && !galaxyTravel.busy && !introPlaying() && !exploringSign(),
      traveling: galaxyTravel.traveling || galaxyTravel.seek != null || galaxyTravel.playUntil != null,
      handsOn: galaxyTravel.handsOn,
    });
  };
  autoClock = requestAnimationFrame(tick);
}

/** t-distance from the camera to this sign's gate. Positive = still ahead. */
export function alongToGate(t: number, index: number) {
  return signedDelta(t, signStation(index) + GATE);
}

/** 1 while you approach and pass through; gone the moment the next sign owns the sky. */
export function gateForm(along: number, index?: number, t?: number) {
  if (index != null && t != null) {
    const n = nearestSign(t);
    const nxt = (n + 1) % 12;
    const aim = aimedIndex(t);
    if (index !== n && index !== nxt && index !== aim) return 0;
    if (index === nxt && index !== aim && along < 0.35) return 0;
  }
  if (along > 2.85) return 0;
  if (along > 1.05) return smooth01((2.85 - along) / 1.8);
  if (along > 0.04) return 1;
  if (along > -0.62) return smooth01((along + 0.62) / 0.66);
  return 0;
}

/** 0 = animal constellation, 1 = glyph. Completes mid-approach so you fly through the symbol. */
export function signMorph(along: number) {
  if (prefersReducedMotion()) return along < 0.9 ? 1 : 0;
  if (along >= MORPH_FAR) return 0;
  if (along <= MORPH_NEAR) return 1;
  return smooth01((MORPH_FAR - along) / (MORPH_FAR - MORPH_NEAR));
}

/** Soft cosmic pulse at the heart of the morph — cream, not neon. */
export function morphBurst(along: number) {
  if (prefersReducedMotion()) return 0;
  if (along > MORPH_FAR || along < MORPH_NEAR) return 0;
  const mid = (MORPH_FAR + MORPH_NEAR) * 0.5;
  const x = (along - mid) / 0.14;
  return Math.exp(-(x * x));
}

/** 0 = still among the field stars, 1 = locked into the picture. Staggered so they arrive from every side. */
export function starGather(along: number, i: number, n: number) {
  if (prefersReducedMotion()) return along < 1.7 ? 1 : 0;
  const lag = (i / Math.max(1, n)) * 0.46;
  const far = GATHER_FAR - lag * 0.14;
  const lock = GATHER_LOCK - lag * 0.18;
  if (along >= far) return 0;
  if (along <= lock) return 1;
  return smooth01((far - along) / Math.max(0.1, far - lock));
}
