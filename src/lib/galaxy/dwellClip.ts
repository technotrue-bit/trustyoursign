import type { SignId } from "@/lib/chart/types";
import { stationT } from "./temple";

/**
 * Still plate after the camera has settled, before a life clip.
 * Middle of the 2–3s contract. Signs without a clip keep AUTO_SIGN.
 */
export const DWELL_STILL_SEC = 2.5;

/** Crossfade still plate ↔ life clip on the corridor plate (seconds). */
export const DWELL_CROSSFADE_SEC = 0.2;

/** Reference plate pixels for normalizing life-clip UV nudge (matches max sign art canvas). */
export const DWELL_PLATE_REF = { w: 1024, h: 576 } as const;

/** When |video aspect − plate aspect| is below this, use full UV (no cover crop). */
export const DWELL_ASPECT_MATCH_EPS = 0.012;

/**
 * Shift life-clip texels on the plate so frame 0 stacks on SIGN_ART (plate space px).
 * Positive x = move the animal right on screen; positive y = move it down.
 * Aries frame 0 already stacks at 0.
 */
export const DWELL_LIFE_PLATE_NUDGE_PX: Partial<Record<SignId, { x: number; y: number }>> = {};

/**
 * Optional life clip per sign. Absent = still plate and the 7s auto-walk.
 * Prefetch only the station the camera is aimed at.
 */
export const DWELL_CLIPS: Partial<Record<SignId, string>> = {
  aries: "/signs/aries-life.mp4",
  leo: "/signs/leo-life.mp4",
  aquarius: "/signs/aquarius-life.mp4",
};

const videos = new Map<SignId, HTMLVideoElement>();
/** When each sign's clip is allowed to actually start fetching (ms, `performance.now()` clock). */
const primeArmedAt = new Map<SignId, number>();

export function dwellClipFor(id: SignId): string | undefined {
  return DWELL_CLIPS[id];
}

/**
 * Beat to let first paint and the critical-path bytes (fonts, current plate,
 * app JS) clear the connection before a clip's full multi-MB body starts
 * downloading — `syncDwellPrefetch` calls `primeDwellClip` every frame once a
 * sign is aimed at, so without this it started fetching on literally the
 * first frame. `DWELL_STILL_SEC` (2.5s) is still most of the way off, so the
 * clip has plenty of time left to buffer before playback is ever due — this
 * changes nothing the viewer can see.
 *
 * A `preload="metadata"` first stage was tried and reverted: these clips are
 * remuxed "faststart" (moov before mdat) so metadata IS cheap today, but
 * relying on that meant a clip exported without faststart later would make
 * "metadata" fetch nearly the whole file anyway, then a second full fetch on
 * top when this upgrades to "auto" — a silent regression nothing here would
 * catch. Delaying the one `preload="auto"` fetch has no such trap.
 */
const FULL_PRELOAD_DELAY_MS = 1000;

/**
 * Travel t within this of a station counts as on it (≈2% of a sign). Glides land
 * exactly, so this only absorbs float error — a flight passing through is not "on" it.
 */
export const SETTLE_DIST = 0.002;

/** True once travel t is on this station, not still sliding in. Position only. */
export function settledOnSign(t: number, index: number) {
  return Math.abs(t - stationT(index)) <= SETTLE_DIST;
}

function harden(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.loop = false;
  video.autoplay = false;
  video.controls = false;
  video.preload = "auto";
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "true");
  video.disablePictureInPicture = true;
  video.tabIndex = -1;
}

/**
 * Buffer this sign's clip. Does not play. No-op when the sign has no clip,
 * and no-op for `FULL_PRELOAD_DELAY_MS` after the sign is first aimed at
 * (returns `null`) — `syncDwellPrefetch` calls this every frame, so that
 * window is exactly how long the fetch is held off.
 */
export function primeDwellClip(id: SignId): HTMLVideoElement | null {
  const url = DWELL_CLIPS[id];
  if (!url || typeof document === "undefined") return null;
  const existing = videos.get(id);
  if (existing) {
    harden(existing);
    if (!existing.src.endsWith(url)) existing.src = url;
    return existing;
  }
  let armedAt = primeArmedAt.get(id);
  if (armedAt === undefined) {
    armedAt = performance.now() + FULL_PRELOAD_DELAY_MS;
    primeArmedAt.set(id, armedAt);
  }
  if (performance.now() < armedAt) return null;
  const video = document.createElement("video");
  video.dataset.dwellClip = id;
  video.setAttribute("aria-hidden", "true");
  video.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  harden(video);
  video.src = url;
  document.body.appendChild(video);
  videos.set(id, video);
  return video;
}

/** Keep a paused element only for the aimed sign. Drops every other clip. */
export function syncDwellPrefetch(id: SignId | null) {
  if (typeof document === "undefined") return;
  const tracked = new Set([...videos.keys(), ...primeArmedAt.keys()]);
  for (const key of tracked) {
    if (key !== id) stopDwellClip(key);
  }
  if (id && DWELL_CLIPS[id]) primeDwellClip(id);
}

/**
 * Start or resume the clip from the current frame. Does not rewind and does
 * not restart an element that already ended.
 */
export function playDwellClip(id: SignId): HTMLVideoElement | null {
  const video = primeDwellClip(id);
  if (!video || video.ended) return video;
  if (video.paused) void video.play().catch(() => {});
  return video;
}

/** Freeze the frame. Leaves src in place so a later play resumes. */
export function pauseDwellClip(id?: SignId) {
  if (typeof document === "undefined") return;
  const keys = id ? [id] : [...videos.keys()];
  for (const key of keys) videos.get(key)?.pause();
}

/** True when the element can paint a frame (not just metadata). */
export function dwellVideoFrameReady(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 2 &&
    video.videoHeight > 2
  );
}

/**
 * Disarm playback but keep the element so the plate can fade out. Full teardown
 * is `stopDwellClip` once the fade reaches the still.
 */
export function retireDwellClip(id?: SignId) {
  pauseDwellClip(id);
}

/** Stop decoding and drop the element. Safe to call twice. */
export function stopDwellClip(id?: SignId) {
  if (typeof document === "undefined") return;
  const keys = id ? [id] : [...videos.keys()];
  for (const key of keys) {
    primeArmedAt.delete(key);
    const video = videos.get(key);
    if (!video) continue;
    video.pause();
    video.removeAttribute("src");
    try {
      video.load();
    } catch {
      /* already detached */
    }
    video.remove();
    videos.delete(key);
  }
}
