import { useSessionStore } from "@/lib/chart/session";
import { returnToOpenSky } from "@/lib/galaxy/travel";

/**
 * Drop natal, a birth claim, and the library desk, then snap to the title sky.
 *
 * `goHome(undefined)` only clears `desk` / `sign` / `galaxy` / `star`. The
 * history follower keeps an open chart when the address becomes home — sky
 * links depend on that — so this has to run first. Closing a research chart
 * stops on the library desk (`session.origin`); that desk is cleared too.
 * The caller still writes the home place and navigates.
 */
export function leaveToMainMenu(): void {
  const store = useSessionStore.getState();
  if (store.session || store.claim) store.close();
  const after = useSessionStore.getState();
  if (after.session || after.claim || after.surface !== "galaxy") {
    useSessionStore.setState({ session: null, claim: null, surface: "galaxy" });
  }
  returnToOpenSky();
}
