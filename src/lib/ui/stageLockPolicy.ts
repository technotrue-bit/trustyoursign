/** True when StageLock must freeze --app-h (BirthChat keyboard open). */
export function shouldFreezeAppHeight(opts: { pathFieldFocused: boolean }): boolean {
  return opts.pathFieldFocused === true;
}

/**
 * visualViewport.offsetTop tracks iOS rubber-band overscroll as well as keyboard
 * scroll. Following it live into --app-top makes the fixed stage (and WebGL HUD)
 * thrash at the explore bounce edge. Only shift the stage while a BirthChat
 * path field is focused — that is when offsetTop is a real keyboard layout cue.
 */
export function resolveAppTop(opts: {
  pathFieldFocused: boolean;
  offsetTop: number;
}): number {
  if (!opts.pathFieldFocused) return 0;
  return Math.round(opts.offsetTop);
}

/** VV scroll events are only useful while the keyboard path is open. */
export function shouldApplyVisualViewportScroll(opts: {
  pathFieldFocused: boolean;
}): boolean {
  return opts.pathFieldFocused === true;
}
