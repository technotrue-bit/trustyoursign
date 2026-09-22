/**
 * Corridor star field: how long the station cloud stays live while you fly,
 * and a one-shot land burst that kicks its swirl/glow.
 *
 * Station gap is 1/11 ≈ 0.0909 in travel t.
 */

/** Keep the cloud through a light scroll — a bit past halfway to the next sign. */
export const FIELD_KEEP_DIST = 0.11;
/** Gather below this hides the field (soft fade, not a pop). */
export const FIELD_HIDE_GATHER = 0.16;
/** Close enough to count as landed on the sign. */
export const LAND_DIST = 0.024;
/** Must fly this far before a return can burst again (ignores a light nudge). */
export const LEAVE_DIST = 0.06;
/** Burst remaining 1 → 0 over this many seconds. */
export const BURST_SEC = 0.62;

export function fieldGather(dist: number, keep = FIELD_KEEP_DIST) {
  const d = Math.max(0, dist);
  const span = Math.max(1e-6, keep);
  return 1 - Math.min(1, d / span);
}

export function fieldVisible(gather: number) {
  return gather > FIELD_HIDE_GATHER;
}

export function fieldFade(gather: number) {
  const span = 1 - FIELD_HIDE_GATHER;
  return Math.min(1, Math.max(0, (gather - FIELD_HIDE_GATHER) / span));
}

export type ArriveBurst = {
  aimed: number | null;
  far: boolean;
  burst: number;
};

export function createArriveBurst(): ArriveBurst {
  return { aimed: null, far: true, burst: 0 };
}

/** Shared corridor land-burst. Ticked once per frame by ArriveBurstTicker (GalaxyIntro). */
export const signArrive = createArriveBurst();

export function resetArriveBurst(state: ArriveBurst = signArrive) {
  state.aimed = null;
  state.far = true;
  state.burst = 0;
}

/**
 * Fire a burst when you land on a sign. A light scroll stays "landed" so it
 * does not retrigger. Pause during intro / sign-enter so the first rest
 * after Skip is the land.
 */
export function stepArriveBurst(
  state: ArriveBurst,
  opts: {
    aimed: number;
    dist: number;
    dt: number;
    reduced?: boolean;
    paused?: boolean;
  },
): { burst: number; fired: boolean } {
  const dt = Math.min(0.05, Math.max(0, opts.dt));
  if (opts.paused) {
    if (state.burst > 0) state.burst = Math.max(0, state.burst - dt / (BURST_SEC * 0.45));
    return { burst: state.burst, fired: false };
  }
  if (state.aimed !== opts.aimed) {
    state.aimed = opts.aimed;
    state.far = true;
  }
  if (opts.dist > LEAVE_DIST) state.far = true;
  let fired = false;
  if (state.far && opts.dist <= LAND_DIST) {
    state.far = false;
    state.burst = opts.reduced ? 0.28 : 1;
    fired = !opts.reduced;
    return { burst: state.burst, fired };
  }
  if (state.burst > 0) state.burst = Math.max(0, state.burst - dt / BURST_SEC);
  return { burst: state.burst, fired };
}

export function burstEnvelope(burst: number) {
  const x = Math.min(1, Math.max(0, burst));
  return x * x * (3 - 2 * x);
}

export const CLOUD_GAIN_IDLE = { swirl: 1, hover: 1, opacity: 1 } as const;

/** Multipliers for the existing station-cloud uniforms. */
export function cloudBurstGain(burst: number) {
  const e = burstEnvelope(burst);
  if (e <= 0) return CLOUD_GAIN_IDLE;
  return {
    swirl: 1 + e * 0.85,
    hover: 1 + e * 0.42,
    opacity: 1 + e * 0.5,
  };
}
