/**
 * Taurus-only charge loop for the galaxy strip plate.
 * Not a dwell clip: it loops while Taurus is the sign in front of you,
 * and it never walks the camera on. Other signs do not use this.
 */

export const TAURUS_PLATE_LOOP_URL = "/signs/taurus-loop.mp4";

/** Nearby-only fetch wait, so the loop does not compete with first paint. */
const PRIME_DELAY_MS = 1000;

export type TaurusPlateAction = "play" | "still" | "prime" | "drop";

/**
 * What to do with the charge loop this frame.
 * play  — Taurus is the strip plate and motion is allowed
 * still — Pause is on while Taurus is up: keep the file, show the painting
 * prime — a neighbour, so sliding onto Taurus does not hitch
 * drop  — reduced motion, inside a sign, or far from Taurus: unload
 */
export function taurusPlateAction(input: {
  onStrip: boolean;
  nearby: boolean;
  paused: boolean;
  reduced: boolean;
}): TaurusPlateAction {
  if (input.reduced) return "drop";
  if (input.onStrip && input.paused) return "still";
  if (input.onStrip) return "play";
  if (input.nearby && !input.paused) return "prime";
  return "drop";
}

let video: HTMLVideoElement | null = null;
let primeAt = 0;

function harden(el: HTMLVideoElement) {
  el.muted = true;
  el.defaultMuted = true;
  el.volume = 0;
  el.loop = true;
  el.autoplay = false;
  el.controls = false;
  el.preload = "auto";
  el.playsInline = true;
  el.setAttribute("muted", "");
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "true");
  el.disablePictureInPicture = true;
  el.tabIndex = -1;
}

function ensure(): HTMLVideoElement {
  if (video) {
    harden(video);
    return video;
  }
  const el = document.createElement("video");
  el.dataset.taurusPlateLoop = "true";
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  harden(el);
  el.src = TAURUS_PLATE_LOOP_URL;
  document.body.appendChild(el);
  video = el;
  return el;
}

/** The element when one is mounted. Null until a prime or play actually starts it. */
export function taurusPlateVideo(): HTMLVideoElement | null {
  return video;
}

/** Apply this frame's action. No-op without a document (unit tests). */
export function syncTaurusPlateLoop(action: TaurusPlateAction) {
  if (typeof document === "undefined") return;
  if (action === "drop") {
    stopTaurusPlateLoop();
    return;
  }
  if (action === "still") {
    // The painting is the resting pose. Rewind so Resume starts there, once.
    if (video && !video.paused) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* not seekable yet */
      }
    }
    return;
  }
  if (action === "prime") {
    // A neighbour already has the file: pause now. The delay is only for the first fetch.
    if (video) {
      video.pause();
      return;
    }
    const now = performance.now();
    if (!primeAt) primeAt = now + PRIME_DELAY_MS;
    if (now < primeAt) return;
    ensure().pause();
    return;
  }
  primeAt = 0;
  const el = ensure();
  if (el.paused) void el.play().catch(() => {});
}

/** Stop decoding and drop the element. Safe to call twice. */
export function stopTaurusPlateLoop() {
  primeAt = 0;
  if (typeof document === "undefined" || !video) {
    video = null;
    return;
  }
  video.pause();
  video.removeAttribute("src");
  try {
    video.load();
  } catch {
    /* already detached */
  }
  video.remove();
  video = null;
}
