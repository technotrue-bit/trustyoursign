/**
 * The viewer's motion preference (I5, vestibular comfort).
 *
 * Persisted because it is a comfort setting, not a per-session whim: someone
 * who paused the flight once should not have to pause it at every visit.
 * Lives in localStorage; the switch itself is `setPaused` in galaxyTravel.
 */

const KEY = "vault.motion-paused.v1";

export function readMotionPaused(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMotionPaused(paused: boolean): void {
  try {
    if (paused) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode — the in-memory pause still holds for this tab */
  }
}
