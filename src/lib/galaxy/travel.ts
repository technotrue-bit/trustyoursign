/** Shared mutable travel. Written every frame by the camera. Not React state. */
import { Vector3 } from "three";
import { CONSTELLATIONS, nearestSign, signStation, signSteps, signedDelta } from "./constellations";
import {
  DWELL_STILL_SEC,
  SETTLE_DIST,
  dwellClipFor,
  pauseDwellClip,
  settledOnSign,
  stopDwellClip,
} from "./dwellClip";
import { primeSignArt } from "./signArt";
import { primeSignVolumeNear } from "./signVolume";
import {
  enterBurst,
  enterBurstDissolve,
  enterBurstIgnition,
  enterBurstImpulse,
  enterCoreReveal,
  enterDive,
  enterGalaxyForm,
  enterPlateFade,
  enterRush,
  enterWorldFade,
  getSignGalaxy,
  type ExplorePhase,
} from "./signGalaxy";
import { useGalaxy, currentConstellation } from "./store";
import { NAVE, STATION_N, TEMPLE_CURVE, clamp01, stationFromT, stationT } from "./temple";
import { introPlaying, skipIntro, introCanSkip, templeIntro } from "./intro";
import { ensureSkyHit } from "./skyHit";

export type EnterSkipPhase = "idle" | "out" | "hold" | "in";
/**
 * direct = strip / Enter jump to a neighbour; portal = strip / arrow jump across
 * two or more signs; walk = hands-off advance; glide = wheel / keys;
 * settle = hands-off landing.
 */
type SeekKind = "direct" | "portal" | "walk" | "glide" | "settle";

/** Seconds for the full enter morph (fade → dive → galaxy form). */
const ENTER_SEC = 4.5;
const EXIT_SEC = 1.55;
const SKIP_OUT = 0.42;
const SKIP_HOLD = 0.2;
const SKIP_IN = 0.48;
const SKIP_OUT_RM = 0.18;
const SKIP_HOLD_RM = 0.1;
const SKIP_IN_RM = 0.22;

const BIRTH_SECONDS = 3.85;
/** Idle drift toward you. Keep this low — the sky should feel patient. */
export const CRUISE = 0.14;
/** After a jump, ease through animal → explosion → glyph. Patient so the stars can gather. */
export const PLAY_CRUISE = 0.48;
/** Slide or hold the sky to fly — medium, same both ways. */
export const HOLD_FLY = 0.42;
/** Hard ceiling on corridor speed, same units as HOLD_FLY. Nothing flies faster, flick or not. */
export const MAX_FLY = 0.72;
/** Travel t per second for one unit of fly speed in the 3D corridor. */
const FLY_T = 0.22;
/** One station in travel t. */
export const STATION_GAP_T = 1 / (STATION_N - 1);
/** Top corridor speed in travel t per second. */
export const MAX_FLY_T = MAX_FLY * FLY_T;
/** World units along −Z per t. Signs sit farther apart so the burst can read. */
const SPACING = 50;
/** Sign sits this far ahead of its station. You still fly through it while its name is up. */
const GATE = 0.55;
/** Hands off: dwell, then walk to the next sign. */
const AUTO_SIGN = 7;
/** Animal holds until this along. */
const MORPH_FAR = 0.92;
/** Glyph is complete by this along — middle of the remaining approach. */
const MORPH_NEAR = 0.42;
/** Stars are still out in the field. */
const GATHER_FAR = 2.55;
/** Stars have locked into the picture. */
const GATHER_LOCK = 1.12;
/** Land this far before the station so the ram is still a ram. */
const SEEK_ARRIVE = 0.55;
/** Cruise this far past the station so the explosion finishes, then the glyph passes. */
const SEEK_THROUGH = 0.34;
/** Never skip more than ~2 frames of birth, even after a load hitch. */
const BIRTH_DT_CAP = 0.032;
/** Strip click: fly straight to the sign without station-hopping. Base, per sign crossed, cap. */
const DIRECT_SEEK_SEC = 0.95;
const DIRECT_SEEK_PER_SIGN = 0.05;
const DIRECT_SEEK_MAX_SEC = 1.5;
/** Wheel notch or hands-off settle: seconds to glide one sign (scaled by √signs). */
export const GLIDE_SEC = 1.5;
/** Hands-off walk to the next sign. Slower than a glide — nobody asked to move. */
const WALK_SEC = 2.4;
/** Hands off past this share of a sign (in the direction of travel) lands the next one; less eases back. */
const SETTLE_COMMIT = 0.12;
/** Camera speed under which it counts as parked, travel t per second. */
export const SETTLED_VEL = 0.002;
/** Drag may lead the camera by at most this much t. One sky, not twelve. */
const DRAG_LEAD_T = 1.2 * STATION_GAP_T;
/** Drag pixels per unit of corridor t. */
const DRAG_T_PX = 3200;
/** Free flight speeds up no faster than this (t per second²). Slowing down is never limited. */
export const FLY_ACCEL_T = 2.5 * STATION_GAP_T;
/** Reduced motion drag: pixels that cut to the next sign. */
const REDUCED_DRAG_STEP_PX = 90;
/** After a sign click/select, hold the highlight this long before clearing. */
export const SELECTION_HOLD_MS = 10_000;
/** First look starts on the ram, before the Aries station. */
export const OPEN_T = 0;
/** Max look offset inside a sign galaxy (camera-right, world units). */
export const EXPLORE_LOOK_MAX_X = 8.5;
export const EXPLORE_LOOK_MAX_Y = 5.5;
/**
 * Inside / Galaxy-threshold landing only. World units the camera stops short
 * of the hub star. Corridor flight does not use this.
 *
 * 2.6 put the lens inside the core's glare (a blown disc over the card).
 * 8.0 holds the home star as a jewel in the room, with sky around it.
 */
export const INSIDE_LANDING_DISTANCE = 8.0;
/** Inside-sign wheel/pinch zoom — pull-back below 1 keeps multiple nodes readable. */
export const EXPLORE_ZOOM_MIN = 0.72;
export const EXPLORE_ZOOM_MAX = 3.2;
/** Soft framing zoom after a travel-point seek (within the inside clamp). */
const SEEK_FRAME_ZOOM = 1.12;
/** Corridor pinch stays tighter so the hero station doesn't drift out. */
const CORRIDOR_ZOOM_MIN = 1;
const CORRIDOR_ZOOM_MAX = 2.7;
/**
 * Drag pixels → look units. Higher = calmer pan (more pixels per degree of look).
 * Tuned so a finger swipe feels deliberate, not hypersensitive.
 * Grab-the-sky: drag right moves stars right.
 */
const EXPLORE_LOOK_DRAG_X = 115;
const EXPLORE_LOOK_DRAG_Y = 135;
/** Touch used to run 1.7× mouse; that made phones whip. Stay near parity. */
const EXPLORE_LOOK_TOUCH_FEEL = 1.05;
/** Look units per second while WASD / arrows are held. */
const EXPLORE_LOOK_KEY_RATE = 3.2;
/**
 * Wheel pixels per sign of intent. The wheel steers a station aim, not a raw
 * velocity: impulse = px / WHEEL_STEP_PX, and the camera glides to the aim.
 */
const WHEEL_STEP_PX = 120;
/** Pixels that commit the first sign of a fresh gesture, so one notch always answers. */
const WHEEL_FIRST_PX = 40;
/** Signs the wheel may queue ahead of the camera. A flick cannot outrun this. */
export const WHEEL_AHEAD = 2;
/** A gap this long ends a wheel gesture; the next notch is a first notch again. */
const WHEEL_GESTURE_GAP_MS = 260;
/** Reduced motion: one cut per step, never a burst of cuts from a trackpad flick. */
const WHEEL_REDUCED_COOLDOWN_MS = 650;
/**
 * A jump across this many signs or more is a portal glide: it feels like one
 * sign of travel instead of racing the whole corridor. Aries ↔ Pisces are
 * calendar neighbours but the two ends of the tropical corridor.
 */
const PORTAL_MIN_SIGNS = 2;
/** Portal progress (0–1) where the empty sky hides the swap from one station to the other. */
export const PORTAL_CUT = 0.5;
/** Inside a sign galaxy the wheel zooms on the original scale. */
const INSIDE_WHEEL_PX = 900;
/** Below this a wheel impulse is trackpad momentum dribble, not a new flick. */
const WHEEL_ARM_IMPULSE = 0.03;
/** How fast the wheel's hands-on latch fades once the fingers stop. */
const WHEEL_GLIDE_DECAY = 2.2;

let reduceCache = false;
let reduceAt = -1e9;
let autoClock = 0;
let autoLast = 0;
let enterSkipWatchdog = 0;
/** Signs committed by the current wheel gesture. */
let wheelCommits = 0;

export const galaxyTravel = {
  t: OPEN_T,
  /** Damped camera follows this. Scroll and seek write here. Clamped 0–1. */
  tTarget: OPEN_T,
  moved: false,
  /** I5: vestibular pause — flight, drift, and sky clocks all hold while true. */
  paused: false,
  /** Shared sky clock: cameras and shaders read this so a pause freezes them together. */
  shaderTime: 0,
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
  /** Travel t per second the camera moved last frame. Written by the 3D rig. */
  vel: 0,
  /** World units between the camera and the station it is parked on. Written by the 3D rig. */
  restDist: 15,
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
  /** Chart / vault / still birthing — don't auto-walk. */
  busy: false,
  /** BirthChat claim sheet is open (session still null). Pauses the 10s hold. */
  claiming: false,
  /** −1 reverse, 0 none, +1 forward. Held while a finger or the wheel is down. */
  hold: 0,
  /** Impulse consumed once per frame by the camera. */
  steer: 0,
  /** Pointer still down on the sky. */
  dragging: false,
  /** performance.now() until a wheel flick still counts as hands-on. */
  wheelUntil: 0,
  /** True while the wheel is what drives the flight, so its glide can fade. */
  wheelDriven: false,
  /** Wheel pixels banked toward the next sign in this gesture. */
  wheelAcc: 0,
  /** Direction of the current wheel gesture. */
  wheelDir: 0,
  /** performance.now() of the last wheel event, to tell gestures apart. */
  wheelAt: 0,
  /** Reduced motion: wheel steps are ignored until this time. */
  wheelCoolUntil: 0,
  /** Last steering direction, so hands-off lands the sign you were heading for. */
  flyDir: 0,
  /** Reduced motion: drag pixels banked toward the next cut. */
  dragAcc: 0,
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
  seekKind: "walk" as SeekKind,
  /** Seconds the current seek takes. Null until its first step knows where it starts. */
  seekDur: null as number | null,
  /** Camera speed when the seek began, so the ease picks up the motion instead of braking. */
  seekV0: 0,
  /**
   * Portal glide: one sign of virtual travel from `portalFrom` toward `portalTo`
   * in `portalDir`. Travel t sits on `portalFrom` until the cut, then on
   * `portalTo`; `portalSigns` is the camera's offset from that station along the
   * corridor (+ = forward). Null when no portal is running.
   */
  portalFrom: null as number | null,
  portalTo: null as number | null,
  portalDir: 1 as 1 | -1,
  portalPhase: 1 as 1 | 2,
  /** Eased virtual progress 0 → 1 of the travel pose. */
  portalV: 0,
  /** Where the lagging camera actually is on that 0 → 1, written by the 3D rig. */
  portalCamV: 0,
  portalCamFed: false,
  portalSigns: 0,
  /**
   * After the pose lands, the camera is still closing in. The arriving plate keeps
   * its portal fade until the camera itself arrives (3D rig only).
   */
  portalTailTo: null as number | null,
  portalTailDir: 1 as 1 | -1,
  /** Offset left by an interrupted portal, folded into the next seek's start. */
  portalFold: 0,
  /** Bumped at a portal cut; world-anchored followers shift by `warp`. */
  warpSeq: 0,
  warp: { x: 0, y: 0, z: 0 },
  /** The cut's jump in virtual travel t (t + portal offset), so speed stays continuous. */
  warpT: 0,
  /** Enter pressed mid-portal: dive once it lands. */
  enterAfterSeek: null as number | null,
  /** Per-sign galaxy explore — nested inside a corridor station. */
  explorePhase: "idle" as ExplorePhase,
  exploreSignIndex: null as number | null,
  exploreProgress: 0,
  enterSkip: "idle" as EnterSkipPhase,
  enterSkipElapsed: 0,
  skipVeil: 0,
  worldFade: 1,
  plateFade: 1,
  /**
   * Opacity the painted plate is actually drawn at this frame (material opacity,
   * before the erode mask per-pixel). Written by the entered station only, so the
   * QA probe reads the plate of the sign being entered rather than a neighbour's.
   * M11 in docs/superpowers/specs/2026-09-15-aries-ignition-handoff-design.md.
   */
  plateOpacity: 1,
  galaxyForm: 0,
  diveBlend: 0,
  /** Extra travel in the back half of the enter — the surge into the galaxy. */
  enterRush: 0,
  /** 0 → 1 as the galaxy core swells into the hero of the shot. */
  coreReveal: 0,
  /** Ignition hand-off: the burst pulse on the same enter clock (0 → peak → 0). */
  burst: 0,
  /** Figure brighten that runs ahead of the blast, so the figure lights first. */
  ignition: 0,
  /** 0 → 1 as the painted plate is eaten away outward from the hub. */
  dissolve: 0,
  /** Shock-front impulse handed to the flight dust. */
  burstImpulse: 0,
  pointIndex: 0,
  pointSeek: null as number | null,
  pointT: 0,
  pointTTarget: 0,
  /** Non-hub stars seekable after full chart + profile for this sign. */
  starsUnlocked: false,
  /** Pulse once when enter lands on hub — UI may open birth claim. */
  claimPrompt: false,
  /** Look offset inside a sign galaxy (camera-right / camera-up, world units). */
  exploreLookX: 0,
  exploreLookY: 0,
  /** Held look: −1 left / +1 right, −1 down / +1 up. Integrated in stepExplore. */
  lookHoldX: 0,
  lookHoldY: 0,
  /**
   * Station whose life clip should replace the still plate. Null keeps the painting.
   * The plate sets dwellClipDone when the file ends; the auto-walk then seeks.
   */
  dwellClipIndex: null as number | null,
  dwellClipDone: false,
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

/** Drop an armed life clip. Leaves a prefetch alone so the still hold can buffer. */
function clearDwellClip() {
  if (galaxyTravel.dwellClipIndex == null && !galaxyTravel.dwellClipDone) return;
  galaxyTravel.dwellClipIndex = null;
  galaxyTravel.dwellClipDone = false;
  stopDwellClip();
}

/** Kill the life clip now; the still plate takes the frame back. */
export function killDwellClip() {
  clearDwellClip();
}

/**
 * Parked on this station: on it, not sliding, nothing queued, nobody steering.
 * Position alone is not enough — a flight passing through the station is not parked.
 */
export function cameraSettledOn(index: number) {
  if (galaxyTravel.seek != null || galaxyTravel.traveling) return false;
  if (galaxyTravel.dragging || galaxyTravel.hold !== 0) return false;
  if (nowMs() < galaxyTravel.wheelUntil) return false;
  if (Math.abs(galaxyTravel.vel) > SETTLED_VEL) return false;
  if (Math.abs(galaxyTravel.tTarget - galaxyTravel.t) > SETTLE_DIST) return false;
  return settledOnSign(galaxyTravel.t, index);
}

/** The life clip may run on this station right now. Refuses unless the camera is SETTLED. */
export function dwellClipMayPlay(index: number) {
  if (prefersReducedMotion() || exploringSign() || introPlaying()) return false;
  if (galaxyTravel.dwellClipIndex !== index || galaxyTravel.dwellClipDone) return false;
  return cameraSettledOn(index);
}

/** Advance the opening birth one display frame. Capped so a hitch never jumps the boom. */
export function stepBirth(dt?: number) {
  if (galaxyTravel.birth >= 1) return false;
  // A pause holds the birth exactly where it is — resuming continues it.
  if (galaxyTravel.paused) return false;
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
  galaxyTravel.claiming = false;
  galaxyTravel.hold = 0;
  galaxyTravel.steer = 0;
  galaxyTravel.dragging = false;
  galaxyTravel.wheelUntil = 0;
  galaxyTravel.wheelDriven = false;
  galaxyTravel.wheelAcc = 0;
  galaxyTravel.wheelDir = 0;
  galaxyTravel.wheelAt = 0;
  galaxyTravel.wheelCoolUntil = 0;
  galaxyTravel.flyDir = 0;
  galaxyTravel.dragAcc = 0;
  galaxyTravel.vel = 0;
  wheelCommits = 0;
  galaxyTravel.epoch += 1;
  galaxyTravel.zoom = 1;
  galaxyTravel.zoomTarget = 1;
  galaxyTravel.seekDirect = false;
  galaxyTravel.seekTargetIndex = null;
  galaxyTravel.seekStartT = null;
  galaxyTravel.seekElapsed = 0;
  galaxyTravel.seekKind = "walk";
  galaxyTravel.seekDur = null;
  galaxyTravel.seekV0 = 0;
  clearPortal();
  galaxyTravel.portalFold = 0;
  galaxyTravel.enterAfterSeek = null;
  resetExplore(false);
  clearDwellClip();
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
 * Tick the post-select hold. Pauses while claim is open, vault is busy, exploring, or intro plays.
 * Safe to call from the shared auto clock and the sky/camera frames.
 */
export function stepSelectionHold() {
  if (galaxyTravel.selectionHoldLeft == null) return;
  if (galaxyTravel.paused) {
    // Freeze the countdown: keep the sample time fresh so resuming does not
    // burn the remaining hold in one frame.
    galaxyTravel.selectionHoldAt = nowMs();
    return;
  }
  if (!galaxyTravel.moved) {
    galaxyTravel.selectionHoldLeft = null;
    return;
  }
  const now = nowMs();
  if (galaxyTravel.busy || galaxyTravel.claiming || exploringSign() || introPlaying()) {
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

function applyEnterCurves(p: number, reduced = prefersReducedMotion(), withBurst = true) {
  const q = clamp01(p);
  galaxyTravel.exploreProgress = q;
  galaxyTravel.worldFade = enterWorldFade(q);
  galaxyTravel.plateFade = enterPlateFade(q);
  galaxyTravel.galaxyForm = enterGalaxyForm(q);
  galaxyTravel.diveBlend = enterDive(q);
  galaxyTravel.enterRush = enterRush(q);
  galaxyTravel.coreReveal = enterCoreReveal(q);
  // The ignition hand-off rides the same clock. `withBurst` is false on the way
  // out: the exit replays the enter curves backwards and must not fire the blast
  // (a reverse burst is its own spec, not this one).
  galaxyTravel.burst = withBurst ? enterBurst(q, reduced) : 0;
  galaxyTravel.ignition = withBurst ? enterBurstIgnition(q, reduced) : 0;
  galaxyTravel.dissolve = withBurst ? enterBurstDissolve(q) : 0;
  galaxyTravel.burstImpulse = withBurst ? enterBurstImpulse(q, reduced) : 0;
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
  galaxyTravel.plateOpacity = 1;
  galaxyTravel.galaxyForm = 0;
  galaxyTravel.diveBlend = 0;
  galaxyTravel.enterRush = 0;
  galaxyTravel.coreReveal = 0;
  galaxyTravel.burst = 0;
  galaxyTravel.ignition = 0;
  galaxyTravel.dissolve = 0;
  galaxyTravel.burstImpulse = 0;
  galaxyTravel.pointIndex = 0;
  galaxyTravel.pointSeek = null;
  galaxyTravel.pointT = 0;
  galaxyTravel.pointTTarget = 0;
  galaxyTravel.starsUnlocked = false;
  galaxyTravel.claimPrompt = false;
  resetExploreLook();
  if (publish) publishExplore();
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function resetExploreLook() {
  galaxyTravel.exploreLookX = 0;
  galaxyTravel.exploreLookY = 0;
  galaxyTravel.lookHoldX = 0;
  galaxyTravel.lookHoldY = 0;
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
  resetExploreLook();
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
  clearDwellClip();
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
  // Mid-portal the camera is between two stations' frames: dive once it lands.
  if (portalActive()) {
    galaxyTravel.enterAfterSeek = i;
    return true;
  }
  seekSign(i, { direct: true, portal: false });
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
  resetExploreLook();
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
  resetExploreLook();
  noteControl();
  publishExplore();
  return true;
}

/**
 * Leave for Back. `exitSignGalaxy` refuses during the enter dive so Skip stays
 * the only way to jump the cinematic — Back still has to unwind that dive,
 * or the visitor sits on a chrome-less canvas until it finishes.
 */
export function leaveSignGalaxy(): boolean {
  if (!exploringSign()) return false;
  if (galaxyTravel.explorePhase === "exiting") return true;
  if (galaxyTravel.explorePhase === "inside" && galaxyTravel.enterSkip === "idle") {
    return exitSignGalaxy();
  }
  clearEnterSkip();
  galaxyTravel.explorePhase = "exiting";
  galaxyTravel.pointSeek = null;
  galaxyTravel.zoomTarget = 1;
  resetExploreLook();
  noteControl();
  publishExplore();
  return true;
}

/** Title sky — what's-your-sign — after Back pops to a home history entry. */
export function returnToOpenSky() {
  resetTravel(false);
  galaxyTravel.birth = 1;
  skipIntro();
  resetExplore(true);
  publishTravel(OPEN_T, false);
  useGalaxy.setState({
    born: true,
    moved: false,
    t: OPEN_T,
    signIndex: 0,
    introDone: true,
    introSkip: false,
    introTitle: 1,
    introChrome: 1,
    introAsk: 0,
    introVeil: 0,
  });
}

/**
 * Snap the corridor camera onto a sign station (no cruise lerp). Used when a
 * refresh / deep link restores belt selection.
 */
export function snapToSign(index: number) {
  const i = ((Math.round(index) % 12) + 12) % 12;
  const dest = stationT(i);
  const sign = CONSTELLATIONS[i];
  if (!sign) return false;
  if (exploringSign()) resetExplore(false);
  clearDirectSeek();
  clearPortal();
  galaxyTravel.t = dest;
  galaxyTravel.tTarget = dest;
  galaxyTravel.seek = null;
  galaxyTravel.playUntil = null;
  galaxyTravel.moved = true;
  galaxyTravel.awaken = 1;
  galaxyTravel.birth = 1;
  galaxyTravel.zoom = 1;
  galaxyTravel.zoomTarget = 1;
  primeSignArt(sign.id);
  armSelectionHold();
  publishTravel(dest, true);
  noteControl();
  return true;
}

/**
 * Land inside a sign galaxy immediately (no enter dive). Refresh / deep-link
 * restore path — same end state as finishing or skipping the dive.
 */
export function restoreInsideSignGalaxy(index: number, pointIndex = 0) {
  const i = ((Math.round(index) % 12) + 12) % 12;
  const sign = CONSTELLATIONS[i];
  if (!sign) return false;
  skipBirth();
  skipIntro();
  useGalaxy.getState().markBorn();
  snapToSign(i);
  galaxyTravel.exploreSignIndex = i;
  galaxyTravel.starsUnlocked = false;
  galaxyTravel.claimPrompt = false;
  clearEnterSkip();
  primeSignArt(sign.id);
  const galaxy = getSignGalaxy(sign.id);
  landInsideHub();
  const n = galaxy.points.length;
  if (n > 0 && pointIndex > 0) {
    const p = ((Math.round(pointIndex) % n) + n) % n;
    galaxyTravel.pointIndex = p;
    galaxyTravel.pointT = p;
    galaxyTravel.pointTTarget = p;
    galaxyTravel.pointSeek = null;
    publishExplore();
  }
  return true;
}

export function setExploreStarsUnlocked(unlocked: boolean) {
  galaxyTravel.starsUnlocked = Boolean(unlocked);
}

function consumeClaimPrompt() {
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
  if (!point) return false;
  // Every sign galaxy can travel its form. Lore is open in the HUD for everyone
  // (starsUnlocked stays true via exploreAccess). Do not gate movement on unlock.
  galaxyTravel.pointSeek = i;
  galaxyTravel.pointTTarget = i;
  galaxyTravel.pointIndex = i;
  // Frame the star: drop any pan offset so settle lands on the node, then ease zoom.
  resetExploreLook();
  galaxyTravel.zoomTarget = clamp(
    galaxyTravel.zoomTarget + (SEEK_FRAME_ZOOM - galaxyTravel.zoomTarget) * 0.45,
    EXPLORE_ZOOM_MIN,
    EXPLORE_ZOOM_MAX,
  );
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
  // Pause freezes the sky, but an in-progress exit must still finish so Back
  // can leave the inside canvas while motion is held.
  if (galaxyTravel.paused && galaxyTravel.explorePhase !== "exiting") return;
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
    applyEnterCurves(p, undefined, false);
    publishExplore();
    return;
  }

  if (phase === "inside") {
    if (galaxyTravel.lookHoldX !== 0 || galaxyTravel.lookHoldY !== 0) {
      applyExploreLookOffset(
        galaxyTravel.lookHoldX * EXPLORE_LOOK_KEY_RATE * dt,
        galaxyTravel.lookHoldY * EXPLORE_LOOK_KEY_RATE * dt,
      );
    }
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

type SeekOptions = { direct?: boolean; auto?: boolean; portal?: boolean };

function clearDirectSeek() {
  galaxyTravel.seekDirect = false;
  galaxyTravel.seekTargetIndex = null;
  galaxyTravel.seekStartT = null;
  galaxyTravel.seekElapsed = 0;
  galaxyTravel.seekDur = null;
  galaxyTravel.seekV0 = 0;
}

/**
 * Cubic ease that leaves `start` at `v0` (t per second) and lands on `dest` at rest
 * after `dur` seconds. With v0 = 0 it is smoothstep. `u` is elapsed / dur.
 */
export function easeArrive(u: number, start: number, dest: number, v0: number, dur: number) {
  const x = clamp01(u);
  const x2 = x * x;
  const x3 = x2 * x;
  return start + (dest - start) * (3 * x2 - 2 * x3) + v0 * dur * (x3 - 2 * x2 + x);
}

/** How long a seek of `gapSigns` stations takes. Reduced motion cuts: zero. */
export function seekSeconds(gapSigns: number, kind: SeekKind, reduced = false) {
  const g = Math.abs(gapSigns);
  if (reduced || !(g > 1e-4)) return 0;
  if (kind === "direct") return Math.min(DIRECT_SEEK_MAX_SEC, DIRECT_SEEK_SEC + DIRECT_SEEK_PER_SIGN * g);
  const base = (kind === "walk" ? WALK_SEC : GLIDE_SEC) * Math.sqrt(g);
  // Smoothstep peaks at 1.5× its average speed — keep that peak under MAX_FLY.
  const capped = (1.5 * g * STATION_GAP_T) / MAX_FLY_T;
  return Math.max(0.35, base, capped);
}

/**
 * Station to land on when hands come off at `t`. Heading forward, anything past
 * SETTLE_COMMIT of a sign lands the next one; less eases back. No direction: nearest.
 */
export function settleStation(t: number, dir: number, commit = SETTLE_COMMIT) {
  const u = clamp01(t) * (STATION_N - 1);
  const i = dir > 0 ? Math.ceil(u - commit) : dir < 0 ? Math.floor(u + commit) : Math.round(u);
  return Math.min(STATION_N - 1, Math.max(0, i));
}

/** A portal glide is in flight. */
export function portalActive() {
  return galaxyTravel.portalTo != null && galaxyTravel.seek != null;
}

function clearPortal() {
  galaxyTravel.portalFrom = null;
  galaxyTravel.portalTo = null;
  galaxyTravel.portalPhase = 1;
  galaxyTravel.portalV = 0;
  galaxyTravel.portalCamV = 0;
  galaxyTravel.portalCamFed = false;
  galaxyTravel.portalSigns = 0;
  galaxyTravel.portalTailTo = null;
}

/**
 * Which way a portal glides: the short way round the wheel, so Aries → Pisces
 * steps back one sign (as the calendar strip reads) instead of racing forward
 * through eleven. A dead heat takes the corridor direction.
 */
export function portalDirection(from: number, to: number): 1 | -1 {
  const ahead = (((to - from) % 12) + 12) % 12;
  // A dead heat (six and six) keeps the corridor direction.
  if (ahead === 6) return to > from ? 1 : -1;
  return signSteps(from, to) === ahead ? 1 : -1;
}

/** A portal's pose has landed but the camera is still closing in on the target. */
export function portalTailing() {
  return galaxyTravel.portalTailTo != null && galaxyTravel.seek == null;
}

/**
 * Portal dissolve for one station's plate, keyed to where the camera really is
 * (it trails the pose), so it cannot depend on frame rate. The leaving sign is
 * gone by the cut; the arriving one rises from zero after it and reaches full as
 * the camera arrives. 1 for every other station, and whenever no portal runs.
 */
export function portalEnvelope(index: number) {
  const v = galaxyTravel.portalCamFed ? galaxyTravel.portalCamV : galaxyTravel.portalV;
  const rise = smooth01((v - PORTAL_CUT) / (1 - PORTAL_CUT));
  if (portalTailing()) return index === galaxyTravel.portalTailTo ? rise : 1;
  if (!portalActive()) return 1;
  const { portalFrom: from, portalTo: to } = galaxyTravel;
  if (galaxyTravel.portalPhase === 1) {
    if (index !== from) return index === to ? 0 : 1;
    return 1 - smooth01(v / PORTAL_CUT);
  }
  if (index !== to) return index === from ? 0 : 1;
  return rise;
}

function beginSeek(i: number, kind: SeekKind) {
  const dest = stationT(i);
  // A portal that has not cut yet just changes where it lands (a strip swipe
  // passing Pisces on its way to Aquarius).
  if (
    kind === "portal" &&
    portalActive() &&
    galaxyTravel.portalPhase === 1 &&
    i !== galaxyTravel.portalFrom
  ) {
    galaxyTravel.portalTo = i;
    galaxyTravel.portalDir = portalDirection(galaxyTravel.portalFrom ?? i, i);
    galaxyTravel.seek = dest;
    galaxyTravel.seekTargetIndex = i;
    return dest;
  }
  galaxyTravel.portalFold = portalActive() ? galaxyTravel.portalSigns : 0;
  clearPortal();
  galaxyTravel.seek = dest;
  galaxyTravel.tTarget = dest;
  galaxyTravel.playUntil = null;
  galaxyTravel.seekKind = kind;
  galaxyTravel.seekStartT = null;
  galaxyTravel.seekElapsed = 0;
  galaxyTravel.seekDur = null;
  galaxyTravel.seekV0 = galaxyTravel.vel;
  galaxyTravel.seekDirect = kind === "direct" || kind === "portal";
  galaxyTravel.seekTargetIndex = galaxyTravel.seekDirect ? i : null;
  if (kind === "portal") {
    const from = stationFromT(galaxyTravel.t);
    galaxyTravel.portalFrom = from;
    galaxyTravel.portalTo = i;
    galaxyTravel.portalDir = portalDirection(from, i);
  }
  return dest;
}

function primeAround(i: number) {
  primeSignVolumeNear(i);
  const sign = CONSTELLATIONS[i];
  if (sign) primeSignArt(sign.id);
  const nxt = CONSTELLATIONS[(i + 1) % 12];
  if (nxt) primeSignArt(nxt.id);
  const prev = CONSTELLATIONS[(i + 11) % 12];
  if (prev) primeSignArt(prev.id);
}

/** Wheel, keys, or a hands-off settle: ease to a neighbouring sign without selecting it. */
function glideToStation(i: number, kind: "glide" | "settle") {
  clearDwellClip();
  beginSeek(i, kind);
  primeAround(i);
  galaxyTravel.moved = true;
  galaxyTravel.awaken = 1;
  // Steering away from a clicked sign ends its hold; the HUD keeps naming signs.
  galaxyTravel.selectionHoldLeft = null;
  restIdle();
}

/** Jump the flight path to a sign. Arrive as the animal and hold until they fly or rest. */
export function seekSign(index: number, opts?: SeekOptions) {
  clearDwellClip();
  // A visitor choosing a sign takes over from the opening, as the wheel and a drag
  // already do. The strip fades in before the intro is marked done; a pick in that
  // window used to fly with every plate but Aries still hidden and the camera unsmoothed.
  if (!opts?.auto && introPlaying()) skipIntro();
  if (enterAnimating()) return galaxyTravel.exploreSignIndex ?? 0;
  if (exploringSign() && galaxyTravel.explorePhase !== "fading") {
    // Strip / external seek leaves an open galaxy first.
    if (galaxyTravel.exploreSignIndex !== ((Math.round(index) % 12) + 12) % 12) {
      resetExplore(true);
    }
  }
  const i = ((Math.round(index) % 12) + 12) % 12;
  // A jump across several signs hides the ones in between rather than strobing through them.
  // Distance is the short way around the wheel. The corridor is a line, so the neighbour
  // across the Aries/Pisces seam is one step on the wheel and eleven along the line.
  // Flying that line is the dash, so a longer line than the wheel still counts as far.
  const aim = stationFromT(galaxyTravel.tTarget);
  const aimSteps = signSteps(aim, i);
  const far = aimSteps > 1 || Math.abs(i - aim) > aimSteps;
  const direct = opts?.direct ?? far;
  const select = !opts?.auto;
  // Two or more signs away on the wheel: glide one sign's worth and swap stations in the
  // empty sky. The seam neighbour is one wheel step, but the line between those ends is
  // the old eleven-sign dash, so it takes the same glide.
  const here = !portalActive()
    ? stationFromT(galaxyTravel.t)
    : galaxyTravel.portalPhase === 1
      ? (galaxyTravel.portalFrom ?? i)
      : (galaxyTravel.portalTo ?? i);
  const span = signSteps(here, i);
  const portal =
    direct &&
    opts?.portal !== false &&
    (span >= PORTAL_MIN_SIGNS || Math.abs(i - here) > span) &&
    !prefersReducedMotion();
  const dest = beginSeek(i, portal ? "portal" : direct ? "direct" : "walk");
  if (select) {
    galaxyTravel.moved = true;
    galaxyTravel.awaken = 1;
  }
  primeAround(i);
  restIdle();
  publishTravel(dest, select ? true : undefined);
  if (select) armSelectionHold();
  primeSignArt(currentConstellation().id);
  return i;
}

/**
 * Hands are off and the camera is between signs: glide onto one. Returns true
 * when a landing started. Safe to call every frame.
 */
export function settleCorridor(t: number) {
  if (galaxyTravel.paused || galaxyTravel.birth < 1 || galaxyTravel.busy) return false;
  if (galaxyTravel.seek != null || galaxyTravel.dragging || galaxyTravel.hold !== 0) return false;
  if (exploringSign() || introPlaying() || pinchQuiet()) return false;
  const i = settleStation(galaxyTravel.tTarget, galaxyTravel.flyDir);
  const dest = stationT(i);
  galaxyTravel.flyDir = 0;
  if (Math.abs(dest - t) <= SETTLE_DIST * 0.5 && Math.abs(galaxyTravel.tTarget - dest) <= SETTLE_DIST) {
    galaxyTravel.tTarget = dest;
    return false;
  }
  glideToStation(i, "settle");
  return true;
}

/** Cancel an easing seek so a finger can steer, keeping the camera's current speed. */
function yieldSeekToHands() {
  if (galaxyTravel.seek == null || galaxyTravel.seekDirect) return;
  galaxyTravel.seek = null;
  clearDirectSeek();
  // The rig follows tTarget at ~2.9/s; leading by vel/2.9 keeps the speed it had.
  galaxyTravel.tTarget = clamp01(galaxyTravel.t + galaxyTravel.vel / 2.9);
}

/** The station the next wheel / key step starts from: a pending seek's target, else the aim. */
function stepOrigin() {
  return (galaxyTravel.seek ?? galaxyTravel.tTarget) * (STATION_N - 1);
}

/**
 * Commit one sign in `dir`. Refuses once the camera would be more than
 * WHEEL_AHEAD signs behind — a flick queues at most that, never a runaway.
 */
function commitStep(dir: 1 | -1) {
  const from = stepOrigin();
  const next = Math.min(
    STATION_N - 1,
    Math.max(0, dir > 0 ? Math.ceil(from + 0.02) : Math.floor(from - 0.02)),
  );
  if (next === Math.round(from) && Math.abs(from - next) < 0.02) return false;
  // Only a glide in flight can build a queue; from rest the step is always one sign.
  const cam = galaxyTravel.seek != null ? galaxyTravel.t * (STATION_N - 1) : from;
  if (Math.abs(next - cam) > WHEEL_AHEAD + 0.02) return false;
  glideToStation(next, "glide");
  return true;
}

/** Keys: one press, one sign. Held keys repeat, capped by WHEEL_AHEAD. */
export function stepSign(dir: 1 | -1) {
  if (flyLocked() || exploringSign() || galaxyTravel.birth < 1) return false;
  if (galaxyTravel.seekDirect && galaxyTravel.seek != null) return false;
  noteControl();
  galaxyTravel.wheelDriven = false;
  galaxyTravel.handsOn = true;
  galaxyTravel.wheelUntil = nowMs() + 220;
  return commitStep(dir);
}

/** Publish camera t to React — during a direct seek, signIndex stays on the target. */
export function publishTravel(t: number, moved?: boolean) {
  const override =
    galaxyTravel.seekDirect && galaxyTravel.seek != null ? galaxyTravel.seekTargetIndex : undefined;
  useGalaxy.getState().setTravel(t, moved, override ?? undefined);
}

/** Hands on the sky — don't auto-advance until they let go. Any touch kills the life clip. */
export function noteControl() {
  restIdle();
  galaxyTravel.playUntil = null;
  clearDwellClip();
}

/**
 * A chart that replaces the galaxy (visitor natal, research desk) freezes
 * flight so that wheel can orbit on its own controls. A sun-sign shelf keeps
 * this galaxy on screen — Open your sky must not lock touch drag.
 * Claim chat and the intro are separate locks, applied by the callers.
 */
export function sessionBlocksSkyFlight(sessionKind: string | null | undefined): boolean {
  return sessionKind != null && sessionKind !== "shelf";
}

function flyLocked() {
  if (galaxyTravel.birth >= 1 && galaxyTravel.busy) return true;
  if (enterAnimating()) return true;
  if (galaxyTravel.explorePhase === "exiting") return true;
  return false;
}

const FLY_IGNORE =
  "button, a, input, textarea, select, details, summary, .sign-strip, .birth-chat, .gloss-card, .chart-talks, .chart-sheet, [data-no-fly], [data-sky-cta], [role='menu'], [role='menuitem'], [role='dialog'], [data-radix-menu-content], [data-radix-popper-content-wrapper]";

/** Duck-typed so the rule is testable outside a browser realm (and across iframes). */
function closestElement(target: EventTarget | null): Element | null {
  const el = target as Element | null;
  return el && typeof el.closest === "function" ? el : null;
}

function flyIgnore(target: EventTarget | null) {
  const el = closestElement(target);
  if (!el) return false;
  return Boolean(el.closest(FLY_IGNORE));
}

/** A box that scrolls on its own keeps the wheel — panels, sheets, lists. */
function scrollsItself(el: Element, hops = 8): boolean {
  if (typeof getComputedStyle !== "function") return false;
  let node: Element | null = el;
  for (let i = 0; i < hops && node; i += 1) {
    const style = getComputedStyle(node);
    const scrolls = /(auto|scroll|overlay)/;
    if (
      (scrolls.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) ||
      (scrolls.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1)
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * The sky takes the wheel; the interface keeps its own scrolling.
 *
 * Flying belongs to the sky surface — the canvas, or the backdrop behind the
 * chrome — not to "everywhere the blacklist does not match". The old rule let a
 * scroll over a panel fly the corridor while the panel itself stayed frozen,
 * because the capture-phase preventDefault landed before the panel saw the event.
 */
export function wheelFlies(target: EventTarget | null): boolean {
  const el = closestElement(target);
  if (!el) return false;
  if (el.closest("canvas, [data-fly-surface]")) return true;
  if (flyIgnore(el)) return false;
  return !scrollsItself(el);
}

/**
 * Hover / pointer sway is mouse-only. Touch has no hover — tracking the finger
 * on pointerdown made the sky ease toward the contact point before any drag,
 * which feels like the camera starts moving on its own.
 */
export function pointerTracksHover(pointerType: string) {
  return pointerType === "mouse";
}

function trackPtr(e: PointerEvent) {
  if (!pointerTracksHover(e.pointerType)) return;
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  galaxyTravel.ptrX = Math.min(0.5, Math.max(-0.5, e.clientX / w - 0.5));
  galaxyTravel.ptrY = Math.min(0.5, Math.max(-0.5, e.clientY / h - 0.5));
  galaxyTravel.ptrOn = true;
}

function canExploreLook() {
  return insideSignGalaxy() && !flyLocked();
}

/** Apply a look offset in camera-right / camera-up. Positive X looks right. */
export function applyExploreLookOffset(dx: number, dy: number) {
  galaxyTravel.exploreLookX = clamp(
    galaxyTravel.exploreLookX + dx,
    -EXPLORE_LOOK_MAX_X,
    EXPLORE_LOOK_MAX_X,
  );
  galaxyTravel.exploreLookY = clamp(
    galaxyTravel.exploreLookY + dy,
    -EXPLORE_LOOK_MAX_Y,
    EXPLORE_LOOK_MAX_Y,
  );
}

/** Held look stick: −1…1 on each axis. Integrated while inside the galaxy. */
export function setExploreLookHold(x: number, y: number) {
  galaxyTravel.lookHoldX = clamp(x, -1, 1);
  galaxyTravel.lookHoldY = clamp(y, -1, 1);
}

/**
 * Look-around pan inside a sign galaxy. Drag right looks right; drag down
 * looks down (same sense as a camera stick). Does not change corridor t.
 */
export function applyExploreLook(dy: number, dx = 0, touch = false) {
  if (!canExploreLook()) return false;
  const feel = touch ? EXPLORE_LOOK_TOUCH_FEEL : 1;
  applyExploreLookOffset((dx * feel) / EXPLORE_LOOK_DRAG_X, -(dy * feel) / EXPLORE_LOOK_DRAG_Y);
  galaxyTravel.handsOn = true;
  galaxyTravel.awaken = 1;
  noteControl();
  return true;
}

/** Finger down → forward, finger up → back. Same for a mouse drag. */
export function applyFlyDelta(dy: number, dx = 0, touch = false) {
  if (introPlaying()) {
    if (introCanSkip()) skipIntro();
    return;
  }
  galaxyTravel.wheelDriven = false;
  if (insideSignGalaxy()) {
    applyExploreLook(dy, dx, touch);
    return;
  }
  if (flyLocked()) return;
  if (galaxyTravel.birth < 1) {
    if (Math.abs(dy) + Math.abs(dx) > 8) skipBirth();
    return;
  }
  const feel = touch ? 1.7 : 1;
  // Match L/R drag to U/D: same feel coeff, and sustain hold on the dominant axis
  // (hold used to ignore dx, so horizontal fly felt one-shot while vertical cruised).
  galaxyTravel.steer += (dy / 420 - dx / 420) * feel;
  const useX = Math.abs(dx) > Math.abs(dy);
  const axis = useX ? -dx : dy;
  if (Math.abs(axis) > 2) {
    galaxyTravel.hold = axis > 0 ? 1 : -1;
    galaxyTravel.flyDir = galaxyTravel.hold;
  }
  galaxyTravel.moved = true;
  galaxyTravel.awaken = 1;
  noteControl();
  if (prefersReducedMotion()) {
    // No flight under reduced motion: bank the drag and cut one sign per step.
    galaxyTravel.dragAcc += (dy - dx) * feel;
    if (Math.abs(galaxyTravel.dragAcc) >= REDUCED_DRAG_STEP_PX) {
      const dir = galaxyTravel.dragAcc > 0 ? 1 : -1;
      galaxyTravel.dragAcc = 0;
      commitStep(dir);
    }
    return;
  }
  // A strip / Enter jump owns the camera until it lands.
  if (galaxyTravel.seekDirect && galaxyTravel.seek != null) return;
  yieldSeekToHands();
  galaxyTravel.tTarget = clamp01(galaxyTravel.tTarget + ((dy - dx) * feel) / DRAG_T_PX);
}

/**
 * Bank wheel pixels toward the next sign. From rest a light touch (WHEEL_FIRST_PX)
 * answers; while the camera is still gliding each further sign costs more, the
 * further it has fallen behind, so a flick cannot stack speed.
 */
function bankWheel(dir: 1 | -1, px: number) {
  // A strip / Enter jump owns the camera until it lands.
  if (galaxyTravel.seekDirect && galaxyTravel.seek != null) return;
  const now = nowMs();
  const fresh = dir !== galaxyTravel.wheelDir || now - galaxyTravel.wheelAt > WHEEL_GESTURE_GAP_MS;
  galaxyTravel.wheelAt = now;
  if (fresh) {
    galaxyTravel.wheelDir = dir;
    galaxyTravel.wheelAcc = 0;
    wheelCommits = 0;
  }
  const reduced = prefersReducedMotion();
  if (reduced && now < galaxyTravel.wheelCoolUntil) return;
  galaxyTravel.wheelAcc += px;
  const behind = Math.abs(stepOrigin() - galaxyTravel.t * (STATION_N - 1));
  const need =
    wheelCommits === 0 || galaxyTravel.seek == null
      ? WHEEL_FIRST_PX
      : WHEEL_STEP_PX * (1 + Math.max(0, behind - 0.5));
  if (galaxyTravel.wheelAcc < need) return;
  if (!commitStep(dir)) {
    // Saturated: extra scrolling is dropped, not queued for later.
    galaxyTravel.wheelAcc = need;
    return;
  }
  wheelCommits += 1;
  galaxyTravel.wheelAcc -= need;
  if (reduced) {
    galaxyTravel.wheelAcc = 0;
    galaxyTravel.wheelCoolUntil = now + WHEEL_REDUCED_COOLDOWN_MS;
  }
}

export function applyWheel(deltaY: number, deltaX = 0, deltaMode = 0) {
  if (introPlaying()) {
    if (introCanSkip()) skipIntro();
    return;
  }
  if (flyLocked()) return;
  const scale = deltaMode === 1 ? 16 : deltaMode === 2 ? 120 : 1;
  // Only the vertical axis flies. A trackpad's two-finger sideways scroll used to
  // sum into this impulse, so a horizontal swipe flew the corridor, and a diagonal
  // one could fly it backwards — `hold` follows the sign of the sum.
  const px = deltaY * scale;
  if (insideSignGalaxy()) {
    if (galaxyTravel.birth < 1) return;
    applyPinch(Math.exp(-(px / INSIDE_WHEEL_PX) * 0.55));
    return;
  }
  if (galaxyTravel.birth < 1) {
    skipBirth();
    return;
  }
  const impulse = px / WHEEL_STEP_PX;
  galaxyTravel.steer += px / INSIDE_WHEEL_PX;
  galaxyTravel.moved = true;
  galaxyTravel.awaken = 1;
  noteControl();
  // A zero or sideways impulse is not a flight command: it must not latch a
  // direction, arm the window, or claim the wheel.
  if (Math.abs(impulse) <= 0.015) return;
  const dir = impulse > 0 ? 1 : -1;
  galaxyTravel.hold = dir;
  galaxyTravel.wheelDriven = true;
  // Trackpad momentum keeps firing events after the fingers lift. Re-arming the
  // window on every dribble made the sky keep flying with nothing touching it, so
  // only a real flick re-arms it.
  if (Math.abs(impulse) >= WHEEL_ARM_IMPULSE) galaxyTravel.wheelUntil = nowMs() + 220;
  bankWheel(dir, Math.abs(px));
}

function applyPinch(ratio: number) {
  if (introPlaying()) {
    if (introCanSkip()) skipIntro();
    return;
  }
  if (flyLocked()) return;
  if (!Number.isFinite(ratio) || ratio <= 0) return;
  const next = galaxyTravel.zoomTarget * ratio;
  if (insideSignGalaxy()) {
    galaxyTravel.zoomTarget = Math.min(EXPLORE_ZOOM_MAX, Math.max(EXPLORE_ZOOM_MIN, next));
  } else {
    galaxyTravel.zoomTarget = Math.min(CORRIDOR_ZOOM_MAX, Math.max(CORRIDOR_ZOOM_MIN, next));
  }
  galaxyTravel.handsOn = true;
  galaxyTravel.awaken = 1;
  pinchQuietUntil = nowMs() + 420;
  noteControl();
}

export function stepZoom(dt: number, stationChanged: boolean) {
  if (galaxyTravel.paused) return;
  if (stationChanged) galaxyTravel.zoomTarget = 1;
  const k = 1 - Math.exp(-dt * 10);
  galaxyTravel.zoom += (galaxyTravel.zoomTarget - galaxyTravel.zoom) * k;
}

export function endFly() {
  galaxyTravel.dragging = false;
  galaxyTravel.hold = 0;
  galaxyTravel.wheelDriven = false;
  galaxyTravel.dragAcc = 0;
  galaxyTravel.handsOn = nowMs() < galaxyTravel.wheelUntil;
}

/**
 * Free corridor flight, one 3D frame (no seek, intro, explore, or claim running).
 * Held drag flies at HOLD_FLY; hands off lands the sign you were heading for.
 */
export function stepCorridorFlight(t: number, dt: number) {
  const hands = galaxyTravel.dragging || nowMs() < galaxyTravel.wheelUntil;
  galaxyTravel.handsOn = hands;
  if (galaxyTravel.dragging && galaxyTravel.hold !== 0 && !prefersReducedMotion()) {
    galaxyTravel.tTarget += galaxyTravel.hold * HOLD_FLY * FLY_T * dt;
  }
  galaxyTravel.tTarget = clamp01(clamp(galaxyTravel.tTarget, t - DRAG_LEAD_T, t + DRAG_LEAD_T));
  decayWheelGlide(dt);
  galaxyTravel.steer = 0;
  settleCorridor(t);
}

/**
 * One frame of free flight: never faster than MAX_FLY, and never gaining speed
 * faster than FLY_ACCEL_T — a drag eases the sky into motion instead of yanking it.
 */
export function capFlightStep(step: number, dt: number, prevVel = galaxyTravel.vel) {
  const cap = MAX_FLY_T * dt;
  const prev = prevVel * dt;
  const slew = FLY_ACCEL_T * dt * dt;
  let s = step;
  if (prev === 0 || Math.sign(s) === Math.sign(prev)) {
    if (Math.abs(s) > Math.abs(prev) + slew) s = Math.sign(s) * (Math.abs(prev) + slew);
  } else if (Math.abs(s) > slew) {
    // Reversing: stop, then gather speed the other way.
    s = Math.sign(s) * slew;
  }
  return clamp(s, -cap, cap);
}

/**
 * A wheel flick coasts and fades instead of running until its window expires.
 * A held finger (drag) or a held key keeps its push, so only the wheel decays.
 */
export function decayWheelGlide(dt: number) {
  if (!galaxyTravel.wheelDriven || galaxyTravel.dragging || galaxyTravel.hold === 0) return;
  galaxyTravel.hold *= Math.exp(-dt * WHEEL_GLIDE_DECAY);
  if (Math.abs(galaxyTravel.hold) < 0.02) galaxyTravel.hold = 0;
}

/** Slide the sky, pinch the sign, scroll the wheel. One winner per gesture. */
let flyBound = false;
export function ensureFlyInput() {
  if (typeof window === "undefined" || flyBound) return;
  flyBound = true;
  // Before the fly listeners, so a tap on Enter / Begin / Keep flying is not a drag.
  ensureSkyHit();

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
    if (pointerTracksHover(e.pointerType)) trackPtr(e);
    else galaxyTravel.ptrOn = false;
    galaxyTravel.handsOn = true;
    if (e.pointerType !== "mouse") e.preventDefault();
    if (e.button === 1) {
      e.preventDefault();
      mode = "fly";
      galaxyTravel.dragging = true;
      galaxyTravel.hold = 1;
      galaxyTravel.flyDir = 1;
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
    if (pointerTracksHover(e.pointerType)) trackPtr(e);
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
    // Own the gesture once look/fly has started so iOS rubber-band cannot
    // scroll the visualViewport under the fixed stage mid-pan.
    if (e.pointerType !== "mouse") e.preventDefault();
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
    // Do not preventDefault unless the sky owns this gesture, or a panel cannot scroll.
    if (!wheelFlies(e.target)) return;
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

  const LOOK_CODES = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowLeft",
    "ArrowDown",
    "ArrowRight",
  ]);
  const lookKeys = new Set<string>();

  const typingInField = () => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return false;
    if (el.isContentEditable) return true;
    return Boolean(el.closest("input, textarea, select, [contenteditable='true']"));
  };

  const refreshLookHold = () => {
    let x = 0;
    let y = 0;
    if (lookKeys.has("KeyA") || lookKeys.has("ArrowLeft")) x -= 1;
    if (lookKeys.has("KeyD") || lookKeys.has("ArrowRight")) x += 1;
    if (lookKeys.has("KeyW") || lookKeys.has("ArrowUp")) y += 1;
    if (lookKeys.has("KeyS") || lookKeys.has("ArrowDown")) y -= 1;
    galaxyTravel.lookHoldX = x;
    galaxyTravel.lookHoldY = y;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (typingInField()) return;
    if (!LOOK_CODES.has(e.code)) return;
    if (!canExploreLook()) return;
    lookKeys.add(e.code);
    refreshLookHold();
    e.preventDefault();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!LOOK_CODES.has(e.code)) return;
    lookKeys.delete(e.code);
    refreshLookHold();
  };

  const clearLookKeys = () => {
    if (lookKeys.size === 0) return;
    lookKeys.clear();
    refreshLookHold();
  };

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
  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onKeyUp, { capture: true });
  window.addEventListener("blur", clearLookKeys);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearLookKeys();
  });

  type ControlsProbe = {
    getYaw: () => number;
    getSpeed: () => number;
    getLookX: () => number;
    getLookY: () => number;
    getT: () => number;
    getPhase: () => string;
    setKeys: (codes: string[]) => void;
    applyDrag: (dx: number, dy: number) => void;
    enterSign: (index: number) => boolean;
  };
  (window as Window & { __controlsTest?: ControlsProbe }).__controlsTest = {
    getYaw: () => -galaxyTravel.exploreLookX,
    getSpeed: () => 1,
    getLookX: () => galaxyTravel.exploreLookX,
    getLookY: () => galaxyTravel.exploreLookY,
    getT: () => galaxyTravel.t,
    getPhase: () => galaxyTravel.explorePhase,
    setKeys: (codes: string[]) => {
      lookKeys.clear();
      for (const c of codes) lookKeys.add(c);
      refreshLookHold();
    },
    applyDrag: (dx, dy) => {
      applyFlyDelta(dy, dx, true);
    },
    enterSign: (index) => {
      if (!templeIntro.done) {
        templeIntro.t = Math.max(templeIntro.t, 0.4);
        templeIntro.askT = Math.max(templeIntro.askT, 0.4);
        skipIntro();
      }
      galaxyTravel.birth = 1;
      galaxyTravel.busy = false;
      if (!exploringSign()) enterSignGalaxy(index);
      if (enterAnimating()) skipEnterGalaxy();
      return insideSignGalaxy() || galaxyTravel.enterSkip !== "idle";
    },
  };
}


function finishSeek(dest: number) {
  galaxyTravel.seek = null;
  galaxyTravel.tTarget = dest;
  clearDirectSeek();
  clearPortal();
  // The wheel's latch has done its job once the glide lands; the dwell counts from here.
  if (galaxyTravel.wheelDriven && !galaxyTravel.dragging) galaxyTravel.hold = 0;
  const enter = galaxyTravel.enterAfterSeek;
  if (enter != null) {
    galaxyTravel.enterAfterSeek = null;
    enterSignGalaxy(enter);
  }
}

const _warpFrom = new Vector3();
const _warpTo = new Vector3();

/**
 * Swap the portal from the leaving station's frame to the arriving one's. The
 * virtual camera position is identical on both sides of the cut, so `warp` is
 * exactly how far every world-anchored follower must shift to stay put.
 */
function cutPortal(start: number, to: number, dir: 1 | -1) {
  TEMPLE_CURVE.getPointAt(clamp01(start), _warpFrom);
  TEMPLE_CURVE.getPointAt(stationT(to), _warpTo);
  galaxyTravel.warp.x = _warpTo.x - _warpFrom.x;
  galaxyTravel.warp.y = _warpTo.y - _warpFrom.y;
  galaxyTravel.warp.z = _warpTo.z - _warpFrom.z + dir * NAVE;
  galaxyTravel.warpT = stationT(to) - clamp01(start) - dir * STATION_GAP_T;
  galaxyTravel.warpSeq += 1;
  galaxyTravel.portalPhase = 2;
}

/**
 * One sign of eased virtual travel. Before the cut t holds the start and the
 * camera glides `dir · v` signs off it; after, t holds the target and the camera
 * closes the last `1 − v`. The cut waits for the camera itself to reach
 * PORTAL_CUT, where both plates are dissolved.
 */
function stepPortal(start: number, dt: number) {
  const to = galaxyTravel.portalTo!;
  const dir = galaxyTravel.portalDir;
  const dest = stationT(to);
  if (galaxyTravel.seekDur == null) {
    const dur = seekSeconds(1, "glide", prefersReducedMotion());
    galaxyTravel.seekDur = dur;
    // Carried speed, in signs per second along the portal.
    const carried = (galaxyTravel.seekV0 / STATION_GAP_T) * dir;
    galaxyTravel.seekV0 = dur > 0 ? clamp(carried, -0.35 / dur, Math.min(2 / dur, MAX_FLY_T / STATION_GAP_T)) : 0;
  }
  const dur = galaxyTravel.seekDur;
  galaxyTravel.seekElapsed += Math.max(0, dt);
  const u = dur > 0 ? Math.min(1, galaxyTravel.seekElapsed / dur) : 1;
  const v = dur > 0 ? clamp01(easeArrive(u, 0, 1, galaxyTravel.seekV0, dur)) : 1;
  galaxyTravel.portalV = v;
  if (galaxyTravel.portalPhase === 1) {
    const camV = galaxyTravel.portalCamFed ? galaxyTravel.portalCamV : v;
    if (camV >= PORTAL_CUT || u >= 1) cutPortal(start, to, dir);
  }
  if (galaxyTravel.portalPhase === 1) {
    galaxyTravel.portalSigns = dir * v;
    return { t: start, active: true };
  }
  galaxyTravel.portalSigns = -dir * (1 - v);
  if (u >= 1) {
    const fed = galaxyTravel.portalCamFed && galaxyTravel.enterAfterSeek == null;
    const camV = galaxyTravel.portalCamV;
    finishSeek(dest);
    if (fed && camV < 0.99) {
      // The pose is home; the camera is not. Keep the arrival's fade on the camera.
      galaxyTravel.portalTailTo = to;
      galaxyTravel.portalTailDir = dir;
      galaxyTravel.portalCamFed = true;
      galaxyTravel.portalCamV = camV;
    }
    return { t: dest, active: false };
  }
  return { t: dest, active: true };
}

/** Carried-in speed, clamped so the ease never overshoots the sign or doubles back hard. */
function arrivalV0(v0: number, gap: number, dur: number, kind: SeekKind) {
  if (!(dur > 0) || !Number.isFinite(v0)) return 0;
  const v = kind === "direct" ? v0 : clamp(v0, -MAX_FLY_T, MAX_FLY_T);
  const toward = v === 0 || Math.sign(v) === Math.sign(gap);
  const room = (Math.abs(gap) * (toward ? 2 : 0.35)) / dur;
  return clamp(v, -room, room);
}

/**
 * Ease toward the seek target. Every kind picks up the camera's current speed and
 * lands at rest (smoothstep from a standstill). Reduced motion cuts straight there.
 */
export function stepSeek(t: number, dt: number) {
  if (galaxyTravel.paused) return { t, active: false };
  const dest = galaxyTravel.seek;
  if (dest == null) return { t, active: false };
  if (galaxyTravel.seekStartT == null) {
    // An interrupted portal left the camera off its station: start from where it really is.
    galaxyTravel.seekStartT = clamp01(t + galaxyTravel.portalFold * STATION_GAP_T);
    galaxyTravel.portalFold = 0;
  }
  const start = galaxyTravel.seekStartT;
  if (galaxyTravel.seekKind === "portal" && galaxyTravel.portalTo != null) {
    return stepPortal(start, dt);
  }
  if (galaxyTravel.seekDur == null) {
    const kind = galaxyTravel.seekKind;
    const dur = seekSeconds((dest - start) / STATION_GAP_T, kind, prefersReducedMotion());
    galaxyTravel.seekDur = dur;
    galaxyTravel.seekV0 = arrivalV0(galaxyTravel.seekV0, dest - start, dur, kind);
  }
  const dur = galaxyTravel.seekDur;
  galaxyTravel.seekElapsed += Math.max(0, dt);
  if (!(dur > 0) || galaxyTravel.seekElapsed >= dur) {
    finishSeek(dest);
    return { t: dest, active: false };
  }
  const next = easeArrive(galaxyTravel.seekElapsed / dur, start, dest, galaxyTravel.seekV0, dur);
  return { t: clamp01(next), active: true };
}

/** Sign the camera should be showing — the seek target, else whoever owns this stretch of sky. */
export function aimedIndex(t = galaxyTravel.t) {
  if (galaxyTravel.seek != null) return stationFromT(galaxyTravel.seek);
  return stationFromT(t);
}

function nextSignIndex(t: number) {
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

function handsBlockAuto(handsOn?: boolean) {
  return Boolean(handsOn || galaxyTravel.handsOn || galaxyTravel.dragging || galaxyTravel.hold !== 0);
}

/** Clip URL when the camera is actually parked on this station. */
function parkedDwellClip(index: number): string | undefined {
  if (!cameraSettledOn(index)) return undefined;
  const id = CONSTELLATIONS[index]?.id;
  if (!id) return undefined;
  return dwellClipFor(id);
}

/**
 * Dwell, then seek the next sign. Safe to call from more than one loop — uses wall-clock.
 * A sign with a life clip waits out the still hold and the file. AUTO_SIGN does not cut it.
 */
export function stepAutoSign(
  _dt: number,
  opts: { canAdvance: boolean; traveling?: boolean; handsOn?: boolean; reduced?: boolean },
) {
  if (galaxyTravel.paused) {
    restIdle();
    return false;
  }
  if (!opts.canAdvance || opts.traveling || handsBlockAuto(opts.handsOn) || exploringSign()) {
    if (galaxyTravel.dwellClipIndex != null || galaxyTravel.dwellClipDone) clearDwellClip();
    restIdle();
    return false;
  }

  const now = nowMs();
  if (!galaxyTravel.idleAt) galaxyTravel.idleAt = now;
  galaxyTravel.idle = (now - galaxyTravel.idleAt) / 1000;

  const i = stationFromT(galaxyTravel.t);
  const clip = parkedDwellClip(i);
  const reduced = opts.reduced ?? prefersReducedMotion();
  const held = galaxyTravel.selectionHoldLeft != null;

  if (galaxyTravel.dwellClipIndex != null && (galaxyTravel.dwellClipIndex !== i || !clip)) {
    clearDwellClip();
  }

  if (clip && !reduced) {
    if (galaxyTravel.dwellClipDone && galaxyTravel.dwellClipIndex === i) {
      if (held || i >= 11) return false;
      restIdle();
      seekSign(i + 1, { auto: true });
      return true;
    }
    if (galaxyTravel.dwellClipIndex !== i && galaxyTravel.idle >= DWELL_STILL_SEC) {
      galaxyTravel.dwellClipIndex = i;
      galaxyTravel.dwellClipDone = false;
    }
    // The file plays out. Do not walk at AUTO_SIGN while it still owes that once.
    return false;
  }

  if (clip && reduced) {
    if (galaxyTravel.idle < DWELL_STILL_SEC) return false;
    if (held || i >= 11) return false;
    restIdle();
    seekSign(i + 1, { auto: true });
    return true;
  }

  // Don't hop while a clicked sign is still held — that was re-arming the 10s timer.
  if (held) {
    restIdle();
    return false;
  }
  if (galaxyTravel.idle < AUTO_SIGN) return false;
  restIdle();
  if (i >= 11) return false;
  seekSign(i + 1, { auto: true });
  return true;
}

/**
 * I5: one switch for the whole sky — camera flight, drift, twinkle, and the
 * 7s auto-walk. Pausing stops the shared clocks rather than any single scene,
 * so the 2D sky and the 3D scene freeze together.
 */
export function setPaused(paused: boolean) {
  if (galaxyTravel.paused === paused) return;
  galaxyTravel.paused = paused;
  // Publish to the store: some scene pieces (drei's ambient <Stars>) animate on
  // their own clock and can only be stilled through a prop.
  useGalaxy.getState().setPausedFlag(paused);
  galaxyTravel.hold = 0;
  galaxyTravel.steer = 0;
  galaxyTravel.dragging = false;
  galaxyTravel.wheelUntil = 0;
  galaxyTravel.wheelDriven = false;
  if (paused) {
    stopAutoClock();
    pauseDwellClip();
  } else {
    autoLast = nowMs();
    ensureAutoClock();
  }
  restIdle();
}

/**
 * Advance the shared sky clock unless paused, and return the value the
 * renderers should feed their shaders. Using one clock (not each scene's own
 * elapsed time) is what makes the freeze total.
 */
export function stepShaderTime(dt: number): number {
  if (galaxyTravel.paused) return galaxyTravel.shaderTime;
  const raw =
    typeof dt === "number" && Number.isFinite(dt) && dt > 0 ? Math.min(dt, BIRTH_DT_CAP) : 0;
  galaxyTravel.shaderTime += raw;
  return galaxyTravel.shaderTime;
}

/** Own rAF so the 7s walk keeps time even while the canvas is booting. */
export function ensureAutoClock() {
  if (typeof window === "undefined" || autoClock) return;
  autoLast = nowMs();
  const onVis = () => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      autoLast = nowMs();
    }
  };
  document.addEventListener("visibilitychange", onVis);
  (ensureAutoClock as { _onVis?: () => void })._onVis = onVis;
  const tick = (now: number) => {
    autoClock = requestAnimationFrame(tick);
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      autoLast = now;
      pauseDwellClip();
      return;
    }
    const dt = Math.min(0.1, (now - autoLast) / 1000);
    autoLast = now;
    if (!Number.isFinite(dt) || dt < 0) return;
    stepSelectionHold();
    stepAutoSign(dt, {
      canAdvance: galaxyTravel.birth >= 1 && !galaxyTravel.busy && !introPlaying() && !exploringSign(),
      traveling: galaxyTravel.traveling || galaxyTravel.seek != null || galaxyTravel.playUntil != null,
      handsOn: galaxyTravel.handsOn,
      reduced: prefersReducedMotion(),
    });
  };
  autoClock = requestAnimationFrame(tick);
}

/** Cancel the auto-sign rAF and drop the visibility listener. */
export function stopAutoClock() {
  if (typeof window === "undefined") return;
  if (autoClock) {
    cancelAnimationFrame(autoClock);
    autoClock = 0;
  }
  const onVis = (ensureAutoClock as { _onVis?: () => void })._onVis;
  if (onVis) {
    document.removeEventListener("visibilitychange", onVis);
    (ensureAutoClock as { _onVis?: () => void })._onVis = undefined;
  }
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
function signMorph(along: number) {
  if (prefersReducedMotion()) return along < 0.9 ? 1 : 0;
  if (along >= MORPH_FAR) return 0;
  if (along <= MORPH_NEAR) return 1;
  return smooth01((MORPH_FAR - along) / (MORPH_FAR - MORPH_NEAR));
}

/** Soft cosmic pulse at the heart of the morph — cream, not neon. */
function morphBurst(along: number) {
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
