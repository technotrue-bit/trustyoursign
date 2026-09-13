/** True when StageLock must freeze --app-h (BirthChat keyboard open). */
export function shouldFreezeAppHeight(opts: { pathFieldFocused: boolean }): boolean {
  return opts.pathFieldFocused === true;
}
