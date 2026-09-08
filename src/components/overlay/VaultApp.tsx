import { useEffect, useState, type ComponentType } from "react";
import { getResearchChart } from "@/lib/chart/research";
import {
  useClaim,
  useSessionKind,
  useSessionOrigin,
  useSessionStore,
  useSurface,
  useIsEntered,
  roomsFor,
} from "@/lib/chart/session";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { useGalaxy } from "@/lib/galaxy/store";
import {
  ensureAutoClock,
  ensureFlyInput,
  galaxyTravel,
  skipBirth,
} from "@/lib/galaxy/travel";
import { bootIntro, skipIntro } from "@/lib/galaxy/intro";
import { buryWebGLCanvas, canWebGL, shouldUse3D } from "@/lib/gpu";
import { SceneErrorBoundary } from "../scene-error-boundary";
import { FallbackSky } from "./FallbackSky";
import { GalaxyShell } from "./GalaxyShell";
import { ClaimShell } from "./ClaimShell";
import { LibraryShell } from "./LibraryShell";
import { MeshReviewShell, wantsMeshReview } from "./MeshReviewShell";
import { StarBack } from "./StarBack";
import { NatalShell } from "./NatalShell";
import { resolveGate } from "./resolveGate";

type VaultAppProps = {
  /** From route search — keeps SSR/client mesh-review branch in sync. */
  meshParam?: string;
};

export function VaultApp({ meshParam }: VaultAppProps = {}) {
  const meshReview = wantsMeshReview(meshParam ? `?mesh=${meshParam}` : "");
  const [Scene, setScene] = useState<ComponentType | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const claim = useClaim();
  const surface = useSurface();
  const entered = useIsEntered();
  const sessionKind = useSessionKind();
  const sessionOrigin = useSessionOrigin();
  const claiming = claim !== null && !entered;
  const shelf = sessionKind === "shelf";
  const gate = resolveGate({ entered, claiming, surface });
  // StarBack parity with pre-shell VaultApp: (entered && !shelf) || chat || (origin ?? surface) === "library"
  const showStarBack =
    (entered && !shelf) || claiming || (sessionOrigin ?? surface) === "library";

  useEffect(() => {
    if (!shouldUse3D()) {
      setSceneFailed(true);
      return;
    }
    let cancelled = false;
    void import("@/components/scene/ChartCanvas")
      .then((m) => {
        if (!cancelled && canWebGL()) setScene(() => m.ChartCanvas);
        else if (!cancelled) setSceneFailed(true);
      })
      .catch(() => {
        if (!cancelled) setSceneFailed(true);
      });
    const onLost = () => setSceneFailed(true);
    const hideLost = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLCanvasElement && t.closest(".canvas-root")) buryWebGLCanvas(t);
    };
    window.addEventListener("vault-webgl-lost", onLost);
    window.addEventListener("webglcontextlost", hideLost, true);
    return () => {
      cancelled = true;
      window.removeEventListener("vault-webgl-lost", onLost);
      window.removeEventListener("webglcontextlost", hideLost, true);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useSessionStore.getState();
      if (e.key === "Escape") {
        if (st.session?.selection) st.clear();
        else st.close();
      }
      if (e.key === "Enter" && !st.session) {
        if (st.surface === "galaxy") {
          if (st.claim) return;
          if (galaxyTravel.birth < 1) {
            skipBirth();
            useGalaxy.getState().markBorn();
            return;
          }
          const g = useGalaxy.getState();
          if (g.moved) {
            const sign = CONSTELLATIONS[g.signIndex];
            if (sign) st.openClaim(sign.id);
          } else st.openLibrary();
        }
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 7) {
        const kind = st.session?.kind;
        if (!kind) return;
        const mode = roomsFor(kind)[n - 1];
        if (mode) st.setMode(mode.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    bootIntro();
    galaxyTravel.birth = 1;
    ensureAutoClock();
    ensureFlyInput();
  }, []);

  useEffect(() => {
    galaxyTravel.busy = Boolean(claiming || entered);
    galaxyTravel.claiming = Boolean(claiming);
  }, [claiming, entered]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("desk");
    if (!q) return;
    const clean = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("desk");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    };
    if (q === "library") {
      skipIntro();
      skipBirth();
      useGalaxy.getState().markBorn();
      useSessionStore.getState().openLibrary();
      clean();
      return;
    }
    if (q === "saige" || q === "joey") {
      skipIntro();
      skipBirth();
      useGalaxy.getState().markBorn();
      void getResearchChart({ data: q })
        .then((nat) => {
          useSessionStore.getState().openResearch(q, nat);
          clean();
        })
        .catch(() => clean());
    }
  }, []);

  // Isolated mesh-review stage — keeps GalaxyIntro / plate hydrate path untouched.
  if (meshReview) return <MeshReviewShell />;

  return (
    <main
      className="vault-stage relative overflow-hidden bg-bg text-fg"
      style={{ background: "#0c0b0a", color: "#efe8dc" }}
    >
      {Scene && !sceneFailed ? (
        <SceneErrorBoundary fallback={<FallbackSky />}>
          <Scene />
        </SceneErrorBoundary>
      ) : (
        <FallbackSky />
      )}
      {showStarBack ? <StarBack /> : null}
      {gate === "galaxy" ? <GalaxyShell /> : null}
      {gate === "claim" ? <ClaimShell /> : null}
      {gate === "library" ? <LibraryShell /> : null}
      {gate === "natal" ? <NatalShell /> : null}
    </main>
  );
}
