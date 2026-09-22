import type { SignId } from "@/lib/chart/types";
import { LAND_DIST } from "./signField";
import { stationT } from "./temple";

/**
 * Still plate after the camera has settled, before a life clip.
 * Middle of the 2–3s contract. Signs without a clip keep AUTO_SIGN.
 */
export const DWELL_STILL_SEC = 2.5;

/**
 * Optional life clip per sign. Absent = still plate and the 7s auto-walk.
 * Aries is the pioneer. Prefetch only the station the camera is aimed at.
 */
export const DWELL_CLIPS: Partial<Record<SignId, string>> = {
  aries: "/signs/aries-life.mp4",
};

const videos = new Map<SignId, HTMLVideoElement>();

export function dwellClipFor(id: SignId): string | undefined {
  return DWELL_CLIPS[id];
}

/** True once travel t is on this station, not still sliding in. */
export function settledOnSign(t: number, index: number) {
  return Math.abs(t - stationT(index)) <= LAND_DIST;
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

/** Buffer this sign's clip. Does not play. No-op when the sign has no clip. */
export function primeDwellClip(id: SignId): HTMLVideoElement | null {
  const url = DWELL_CLIPS[id];
  if (!url || typeof document === "undefined") return null;
  let video = videos.get(id);
  if (!video) {
    video = document.createElement("video");
    video.dataset.dwellClip = id;
    video.setAttribute("aria-hidden", "true");
    video.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    harden(video);
    document.body.appendChild(video);
    videos.set(id, video);
  }
  harden(video);
  if (!video.src.endsWith(url)) video.src = url;
  return video;
}

/** Keep a paused element only for the aimed sign. Drops every other clip. */
export function syncDwellPrefetch(id: SignId | null) {
  if (typeof document === "undefined") return;
  for (const key of [...videos.keys()]) {
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

/** Stop decoding and drop the element. Safe to call twice. */
export function stopDwellClip(id?: SignId) {
  if (typeof document === "undefined") return;
  const keys = id ? [id] : [...videos.keys()];
  for (const key of keys) {
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
