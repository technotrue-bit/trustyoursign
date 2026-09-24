import { useGalaxy } from "./store";
import { prefersReducedMotion } from "./travel";

export const INTRO_KEY = "templeIntroSeen";
export const INTRO_FULL = 6.8;
export const INTRO_SHORT = 0.7;
export const ASK = 3.4;
const ASK_HOLD = 2.4;

export const templeIntro = {
  t: 0,
  duration: INTRO_FULL,
  done: false,
  seen: false,
  booted: false,
  asking: false,
  askT: 0,
};

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

/** Ease-out cubic — fades start moving, then settle. */
function easeOutCubic(x: number) {
  const u = 1 - clamp01(x);
  return 1 - u * u * u;
}

/**
 * Perlin smootherstep. First and second derivatives are 0 at both ends,
 * so intro windows don't click when they start or land.
 */
function smoother(x: number) {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Progressively draws the Aries constellation after its silhouette gathers. */
export function ariesConstellationReveal(progress: number, reduced = false) {
  if (reduced) return 1;
  return smoother((clamp01(progress) - 0.16) / 0.72);
}

/**
 * Stages the animal's compiled stroke order: horns first, then face/chest,
 * with the legs and tail arriving last. The Aries animal data is authored in
 * that order, so the line renderer can stay a cheap contiguous draw range.
 */
export function ariesConstellationLineReveal(
  progress: number,
  lineIndex: number,
  lineCount: number,
  reduced = false,
) {
  if (reduced) return 1;
  if (lineCount <= 0 || lineIndex < 0 || lineIndex >= lineCount) return 0;
  const overall = ariesConstellationReveal(progress);
  const position = lineIndex / Math.max(1, lineCount - 1);
  const start = 0.04 + position * 0.68;
  return smoother((overall - start) / 0.22);
}

export function ariesConstellationLineCount(
  progress: number,
  lineCount: number,
  reduced = false,
) {
  if (reduced) return Math.max(0, lineCount);
  let visible = 0;
  while (
    visible < lineCount &&
    ariesConstellationLineReveal(progress, visible, lineCount) >= 0.5
  ) {
    visible += 1;
  }
  return visible;
}

function windowOut(t: number, a: number, b: number) {
  return easeOutCubic((t - a) / Math.max(0.001, b - a));
}

function windowInOut(t: number, a: number, b: number) {
  return smoother((t - a) / Math.max(0.001, b - a));
}

/** Durable across tabs/visits; sessionStorage kept for same-tab parity. */
function readSeen(): boolean {
  try {
    if (localStorage.getItem(INTRO_KEY) === "1") return true;
  } catch {
    /* private mode */
  }
  try {
    if (sessionStorage.getItem(INTRO_KEY) === "1") return true;
  } catch {
    /* private mode */
  }
  return false;
}

function markSeen() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* private mode */
  }
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* private mode */
  }
}

/** Finish intro immediately (returning visitor or reduced motion). */
function finishIntroNow() {
  templeIntro.asking = false;
  templeIntro.askT = ASK;
  templeIntro.t = Math.max(templeIntro.t, 1);
  templeIntro.seen = true;
  skipIntro();
}

function publish() {
  const title = introTitle();
  const chrome = introChrome();
  const ask = introAsk();
  const veil = introVeil();
  const skip = introCanSkip() && (templeIntro.asking || chrome < 0.55);
  const st = useGalaxy.getState();
  if (
    Math.abs(st.introTitle - title) < 0.012 &&
    Math.abs(st.introChrome - chrome) < 0.012 &&
    Math.abs(st.introAsk - ask) < 0.012 &&
    Math.abs(st.introVeil - veil) < 0.012 &&
    st.introSkip === skip &&
    st.introDone === templeIntro.done
  ) {
    return;
  }
  useGalaxy.setState({
    introTitle: title,
    introChrome: chrome,
    introAsk: ask,
    introVeil: veil,
    introSkip: skip,
    introDone: templeIntro.done,
  });
  tickInvisibleOpeningProfile();
}

/** Ember → expand → ignite. Visible from the first frames. */
export function uBirth() {
  if (templeIntro.seen || templeIntro.done) return 1;
  return windowOut(templeIntro.t, 0.0, 3.2);
}

/** Collapse → silhouette. Overlaps birth so the sky never goes empty. */
export function uAssemble() {
  if (templeIntro.seen || templeIntro.done) return 1;
  return windowInOut(templeIntro.t, 2.4, 5.6);
}

export function introField() {
  if (templeIntro.seen || templeIntro.done) return 1;
  return windowOut(templeIntro.t, 0.35, 2.8);
}

export function introHaze() {
  if (templeIntro.seen || templeIntro.done) return 1;
  return windowOut(templeIntro.t, 3.4, 5.8);
}

/** Kept for restoring the far galaxy bulge — see `.cursor/skills/celestial-galaxy-bulge`. */
export function introBulge() {
  if (templeIntro.seen || templeIntro.done) return 1;
  return windowOut(templeIntro.t, 3.6, 6.0);
}

export function introArms() {
  if (templeIntro.seen || templeIntro.done) return 1;
  return windowOut(templeIntro.t, 3.8, 6.2);
}

export function introAries() {
  if (templeIntro.seen || templeIntro.done) return 1;
  return uAssemble();
}

export function introCam() {
  if (templeIntro.seen || templeIntro.done) return 1;
  return windowInOut(templeIntro.t, 0.9, 5.2);
}

export function introTitle() {
  if (templeIntro.asking) return 0;
  if (templeIntro.done) return 1;
  if (templeIntro.seen) return windowOut(templeIntro.t, 0, 0.6);
  return windowOut(templeIntro.t, 4.2, 6.0);
}

export function introChrome() {
  if (templeIntro.asking) return 0;
  if (templeIntro.done) return 1;
  if (templeIntro.seen) return windowOut(templeIntro.t, 0.15, 0.7);
  return windowOut(templeIntro.t, 5.2, 6.8);
}

/** Words on the black room. */
export function introAsk() {
  if (templeIntro.done || templeIntro.seen || !templeIntro.asking) return 0;
  const fadeIn = smoother(templeIntro.askT / 0.7);
  const fadeOut = 1 - smoother((templeIntro.askT - ASK_HOLD) / (ASK - ASK_HOLD));
  return fadeIn * fadeOut;
}

/** Opaque cover while the universe asks. Lifts with the last second of the line. */
export function introVeil() {
  if (templeIntro.done || templeIntro.seen || !templeIntro.asking) return 0;
  if (templeIntro.askT < ASK_HOLD) return 1;
  return 1 - smoother((templeIntro.askT - ASK_HOLD) / (ASK - ASK_HOLD));
}

export function introPlaying() {
  return !templeIntro.done;
}

export function introCanSkip() {
  if (templeIntro.done) return false;
  if (templeIntro.asking) return templeIntro.askT >= 0.4;
  return templeIntro.t >= 0.4;
}

export function skipIntro() {
  if (templeIntro.done) return false;
  if (!introCanSkip() && templeIntro.t < 0.4 && templeIntro.askT < 0.4) return false;
  templeIntro.asking = false;
  templeIntro.askT = ASK;
  templeIntro.t = templeIntro.duration;
  templeIntro.done = true;
  markSeen();
  useGalaxy.getState().markBorn();
  useGalaxy.setState({
    introTitle: 1,
    introChrome: 1,
    introAsk: 0,
    introVeil: 0,
    introSkip: false,
    introDone: true,
  });
  return true;
}

export function stepIntro(dt: number) {
  if (templeIntro.done) return false;
  const step = Math.min(0.033, Math.max(0, dt));
  if (templeIntro.asking) {
    templeIntro.askT = Math.min(ASK, templeIntro.askT + step);
    if (templeIntro.askT >= ASK_HOLD) {
      templeIntro.t = Math.min(templeIntro.duration, templeIntro.t + step);
    }
    if (templeIntro.askT >= ASK) templeIntro.asking = false;
    publish();
    return false;
  }
  templeIntro.t = Math.min(templeIntro.duration, templeIntro.t + step);
  publish();
  if (templeIntro.t >= templeIntro.duration) {
    templeIntro.done = true;
    markSeen();
    useGalaxy.getState().markBorn();
    useGalaxy.setState({
      introTitle: 1,
      introChrome: 1,
      introAsk: 0,
      introVeil: 0,
      introSkip: false,
      introDone: true,
    });
    return true;
  }
  return false;
}

export function bootIntro() {
  if (templeIntro.booted) return;
  templeIntro.booted = true;
  useGalaxy.getState().markBorn();
  const seen = readSeen();
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Returning visitors (and reduced-motion) skip the ask + full temple load.
  if (reduceMotion || seen) {
    finishIntroNow();
    return;
  }
  templeIntro.seen = false;
  templeIntro.duration = INTRO_FULL;
  templeIntro.t = 0;
  templeIntro.done = false;
  templeIntro.asking = true;
  templeIntro.askT = 0;
  publish();
}

/** Test helper — reset mutable intro machine between cases. */
export function resetIntroForTests() {
  templeIntro.t = 0;
  templeIntro.duration = INTRO_FULL;
  templeIntro.done = false;
  templeIntro.seen = false;
  templeIntro.booted = false;
  templeIntro.asking = false;
  templeIntro.askT = 0;
}
