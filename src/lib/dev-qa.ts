import { CONSTELLATIONS } from "./galaxy/constellations";
import { ASK, introPlaying, skipIntro, templeIntro } from "./galaxy/intro";
import { galaxyTravel, enterSignGalaxy, seekSign, skipEnterGalaxy } from "./galaxy/travel";
import { clearSignGalaxyCache, getSignGalaxy } from "./galaxy/signGalaxy";
import { clearBurstParamCache } from "./galaxy/signBurst";
import { clearSignBurstCache, clearSignCoreCache } from "./galaxy/signCore";
import { getSignVolume } from "./galaxy/signVolume";
import { isSmallGpu } from "./gpu";
import { loadSignArt, artAspect, primeSignArt } from "./galaxy/signArt";
import {
  DWELL_ASPECT_MATCH_EPS,
  dwellVideoFrameReady,
  primeDwellClip,
  stopDwellClip,
} from "./galaxy/dwellClip";
import { galaxyFigureBox, getFigureMatch, paintedFigureBox } from "./galaxy/signAlign";
import { useGalaxy } from "./galaxy/store";
import { stationT } from "./galaxy/temple";
import type { SignId } from "./chart/types";

/**
 * Dev-only QA hooks (`scripts/qa/enter-capture.mjs`).
 *
 * The capture harness used to `import("/src/lib/galaxy/travel.ts")` from the
 * page — which breaks the moment Vite serves the app's copy under an HMR query
 * (two module instances, so the app never sees the writes). The app installs
 * these hooks itself instead, so QA always drives the live instance.
 *
 * Stripped from production builds (`import.meta.env.DEV`).
 */
export type QaState = {
  phase: string;
  t: number;
  tTarget: number;
  p: number;
  plateFade: number;
  /** Opacity the entered sign's painted plate is drawn at (material opacity). */
  plateOpacity: number;
  form: number;
  dive: number;
  rush: number;
  core: number;
  /** Ignition hand-off channels — what the burst pass is doing right now. */
  burst: number;
  ignition: number;
  dissolve: number;
  impulse: number;
  /** Corridor flight: camera speed (t/s), pending seek target, clip armed on. */
  vel: number;
  seek: number | null;
  seekKind: string;
  dwellClipIndex: number | null;
  dwellClipDone: boolean;
  /** Portal glide: camera offset off its station (signs, + forward), phase, camera progress. */
  portalSigns: number;
  portalPhase: number | null;
  portalCamV: number;
  introPlaying: boolean;
  introAsking: boolean;
  /** Corridor weight each station's plate drew last frame (one owner at a time). */
  plates: number[];
  probe: Record<string, unknown> | null;
};

function hook() {
  return (window as unknown as { __tysQa?: Record<string, unknown> }).__tysQa;
}

export function installQaHooks() {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;
  if (hook()) return;

  const api = {
    /**
     * The state a visitor reaches by hand: intro done, sky open, hands on the sky.
     * `moved: false` stops on the "what's your sign?" title instead.
     */
    ready({ moved = true }: { moved?: boolean } = {}) {
      skipIntro();
      templeIntro.done = true;
      templeIntro.asking = false;
      templeIntro.t = templeIntro.duration;
      templeIntro.askT = ASK;
      useGalaxy.getState().markBorn();
      useGalaxy.setState({
        introDone: true,
        introSkip: false,
        introTitle: 1,
        introChrome: 1,
        introAsk: 0,
        introVeil: 0,
      });
      galaxyTravel.birth = 1;
      galaxyTravel.moved = moved;
      return { introPlaying: introPlaying() };
    },
    /** Fly to a sign the way the strip does. Returns the t the camera is aiming at. */
    parkAt(index: number) {
      seekSign(index, { direct: true });
      return { target: stationT(index), t: galaxyTravel.t };
    },
    enter(index: number) {
      return enterSignGalaxy(index);
    },
    skip() {
      return skipEnterGalaxy();
    },
    signIndex(id: string) {
      return CONSTELLATIONS.findIndex((c) => c.id === id);
    },
    /** Boxes + alignment transform for a sign — how the live figure is laid over the plate. */
    align(id: string) {
      const signId = id as SignId;
      const galaxy = getSignGalaxy(signId);
      const vol = getSignVolume(signId);
      return {
        field: galaxyFigureBox(galaxy.stars),
        painted: vol ? paintedFigureBox(vol) : null,
        match: getFigureMatch(signId, galaxy),
      };
    },
    /** Warm a sign's plate PNG + alpha grid (the alignment needs both measured). */
    preload(id: string) {
      const signId = id as SignId;
      primeSignArt(signId);
      const kick = () => {
        if (!getSignVolume(signId)) window.setTimeout(kick, 250);
      };
      kick();
      return true;
    },
    /**
     * Cold every per-sign cache: galaxy builds, burst recipes, core sprites and
     * burst sprites. Determinism runs use it to prove a reload paints the same
     * sign from scratch rather than handing back a cached texture.
     */
    resetCaches() {
      clearSignGalaxyCache();
      clearBurstParamCache();
      clearSignCoreCache();
      clearSignBurstCache();
      return true;
    },
    state(): QaState {
      return {
        phase: galaxyTravel.explorePhase,
        t: galaxyTravel.t,
        tTarget: galaxyTravel.tTarget,
        p: galaxyTravel.exploreProgress,
        plateFade: galaxyTravel.plateFade,
        plateOpacity: galaxyTravel.plateOpacity,
        form: galaxyTravel.galaxyForm,
        dive: galaxyTravel.diveBlend,
        rush: galaxyTravel.enterRush,
        core: galaxyTravel.coreReveal,
        burst: galaxyTravel.burst,
        ignition: galaxyTravel.ignition,
        dissolve: galaxyTravel.dissolve,
        impulse: galaxyTravel.burstImpulse,
        vel: galaxyTravel.vel,
        seek: galaxyTravel.seek,
        seekKind: galaxyTravel.seekKind,
        dwellClipIndex: galaxyTravel.dwellClipIndex,
        dwellClipDone: galaxyTravel.dwellClipDone,
        portalSigns: galaxyTravel.portalSigns,
        portalPhase: galaxyTravel.portalTo != null ? galaxyTravel.portalPhase : null,
        portalCamV: galaxyTravel.portalCamV,
        introPlaying: introPlaying(),
        introAsking: templeIntro.asking,
        plates: Array.from(
          (window as unknown as { __tysPlates?: ArrayLike<number> }).__tysPlates ?? [],
        ),
        probe: (window as unknown as { __tys?: Record<string, unknown> }).__tys ?? null,
      };
    },
    /** Dwell life-clip element + travel flags for corridor capture strips. */
    dwellClipFrame(signId = "aries") {
      const video = document.querySelector(
        `video[data-dwell-clip="${signId}"]`,
      ) as HTMLVideoElement | null;
      return {
        t: galaxyTravel.t,
        dwellClipIndex: galaxyTravel.dwellClipIndex,
        dwellClipDone: galaxyTravel.dwellClipDone,
        dwellPlateQa: galaxyTravel.dwellPlateQa,
        videoCurrentTime: video ? video.currentTime : null,
        videoPaused: video ? video.paused : null,
        videoEnded: video ? video.ended : null,
      };
    },
    /** Park on Aries and force still-only or a single life frame for plate compares. */
    dwellPlateShot(mode: "still" | "life0" | "lifeLast") {
      stopDwellClip("aries");
      galaxyTravel.dwellClipIndex = null;
      galaxyTravel.dwellClipDone = false;
      galaxyTravel.dwellPlateQa = mode;
      seekSign(0, { direct: true });
      if (mode === "still") return { mode };
      const video = primeDwellClip("aries");
      if (!video) return { mode, error: "no-video" as const };
      video.pause();
      if (mode === "life0") {
        video.currentTime = 0;
      } else {
        const end =
          Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6.041667;
        video.currentTime = Math.max(0, end - 1 / 30);
      }
      return {
        mode,
        ready: dwellVideoFrameReady(video),
        currentTime: video.currentTime,
        duration: video.duration,
        ended: video.ended,
      };
    },
    clearDwellPlateShot() {
      galaxyTravel.dwellPlateQa = null;
    },
    /** Log video vs plate aspect for dwell QA (phone cover-crop diagnosis). */
    dwellPlateDiag(signId: SignId = "aries") {
      const video = document.querySelector(
        `video[data-dwell-clip="${signId}"]`,
      ) as HTMLVideoElement | null;
      const vol = getSignVolume(signId);
      const artTex = loadSignArt(signId);
      const artPlateAspect = artAspect(artTex);
      const volumeAspect = vol?.aspect ?? null;
      const plateAspectUsed = artPlateAspect;
      const vw = video?.videoWidth ?? 0;
      const vh = video?.videoHeight ?? 0;
      const videoAspect = vw > 2 && vh > 2 ? vw / vh : null;
      const aspectDelta =
        videoAspect != null ? Math.abs(videoAspect - plateAspectUsed) : null;
      return {
        videoWidth: vw || null,
        videoHeight: vh || null,
        videoAspect,
        artPlateAspect,
        volumeAspect,
        plateAspectUsed,
        aspectMatchEpsilon: DWELL_ASPECT_MATCH_EPS,
        aspectsMatch:
          aspectDelta != null ? aspectDelta <= DWELL_ASPECT_MATCH_EPS : null,
        coverCropWouldApply:
          aspectDelta != null ? aspectDelta > DWELL_ASPECT_MATCH_EPS : null,
        dwellPlateQa: galaxyTravel.dwellPlateQa,
        isSmallGpu: isSmallGpu(),
      };
    },
  };

  (window as unknown as { __tysQa?: typeof api }).__tysQa = api;
}
