import { CONSTELLATIONS } from "./galaxy/constellations";
import { ASK, introPlaying, skipIntro, templeIntro } from "./galaxy/intro";
import { galaxyTravel, enterSignGalaxy, seekSign, skipEnterGalaxy } from "./galaxy/travel";
import { useGalaxy } from "./galaxy/store";
import { stationT } from "./galaxy/temple";

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
  form: number;
  dive: number;
  rush: number;
  core: number;
  probe: Record<string, unknown> | null;
};

function hook() {
  return (window as unknown as { __tysQa?: Record<string, unknown> }).__tysQa;
}

export function installQaHooks() {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;
  if (hook()) return;

  const api = {
    /** The state a visitor reaches by hand: intro done, sky open, hands on the sky. */
    ready() {
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
      galaxyTravel.moved = true;
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
    state(): QaState {
      return {
        phase: galaxyTravel.explorePhase,
        t: galaxyTravel.t,
        tTarget: galaxyTravel.tTarget,
        p: galaxyTravel.exploreProgress,
        plateFade: galaxyTravel.plateFade,
        form: galaxyTravel.galaxyForm,
        dive: galaxyTravel.diveBlend,
        rush: galaxyTravel.enterRush,
        core: galaxyTravel.coreReveal,
        probe: (window as unknown as { __tys?: Record<string, unknown> }).__tys ?? null,
      };
    },
  };

  (window as unknown as { __tysQa?: typeof api }).__tysQa = api;
}
