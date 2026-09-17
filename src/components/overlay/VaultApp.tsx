import { useEffect, useState, type ComponentType, lazy, Suspense } from "react";
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
  prefersReducedMotion,
  seekSign,
  setPaused,
  skipBirth,
  stopAutoClock,
} from "@/lib/galaxy/travel";
import { bootIntro, skipIntro } from "@/lib/galaxy/intro";
import { readGuestDraft } from "@/lib/ui/guestDraft";
import { readMotionPaused } from "@/lib/ui/motionPreference";
import { buryWebGLCanvas, canWebGL, shouldUse3D } from "@/lib/gpu";
import { SceneErrorBoundary } from "../scene-error-boundary";
import { GalaxyShell } from "./GalaxyShell";
import { ClaimShell } from "./ClaimShell";
import { LibraryShell } from "./LibraryShell";
import { MeshReviewShell, wantsMeshReview } from "./MeshReviewShell";
import { StarBack } from "./StarBack";
import { NatalShell } from "./NatalShell";
import { resolveGate } from "./resolveGate";

const FallbackSky = lazy(() =>
  import("./FallbackSky").then((m) => ({ default: m.FallbackSky })),
);

/** J4/I2: honest copy when the 3D sky fails — the 2D sky is not a dead end. */
const FALLBACK_NOTE =
  "The 3D sky could not load here — flying the 2D sky instead. Every sign still opens.";

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
    // Reduced motion: never import or mount the WebGL scene - the 2D
    // FallbackSky is the whole canvas for these users.
    if (prefersReducedMotion() || !shouldUse3D()) {
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
      const target = e.target instanceof Element ? e.target : null;
      // Typing in a form field must keep native key behavior — the galaxy
      // shortcuts below only apply outside inputs.
      const inField =
        target?.closest("input, select, textarea, [contenteditable]") != null;
      if (e.key === "Escape") {
        if (st.session?.selection) st.clear();
        else st.close();
      }
      if (e.key === "Enter" && !st.session && !inField) {
        if (st.surface === "galaxy") {
          if (st.claim) return;
          if (galaxyTravel.birth < 1) {
            skipBirth();
            useGalaxy.getState().markBorn();
            return;
          }
          // Enter dives into the selected sign (GalaxyIntro owns that key). The
          // birth chat is no longer a way in from the sky — there is one way in.
          const g = useGalaxy.getState();
          if (!g.moved) st.openLibrary();
        }
      }
      // Belt keyboard navigation (B4): left/right walks the signs, only
      // while the landing belt is the active surface — not inside a sign
      // galaxy, a claim, a session, or a form field.
      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !inField
      ) {
        const g = useGalaxy.getState();
        if (
          g.born &&
          g.explore.phase === "idle" &&
          st.surface === "galaxy" &&
          !st.session &&
          !st.claim
        ) {
          e.preventDefault();
          const next =
            e.key === "ArrowLeft"
              ? (g.signIndex + 11) % 12
              : (g.signIndex + 1) % 12;
          // Direct seek — same short lerp as clicking a name in the belt.
          seekSign(next, { direct: true });
        }
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 7 && !inField) {
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
    // D2/F7: an in-progress guest birth survives reloads and sign-in
    // redirects — reopen it if this tab still holds one and nothing else
    // is open. In-tab storage only (see guestDraft).
    const draft = readGuestDraft();
    if (draft) {
      const st = useSessionStore.getState();
      if (!st.session && !st.claim) {
        st.openClaim(draft.signId);
        if (draft.birth) st.setClaimBirth(draft.birth);
      }
    }
    galaxyTravel.birth = 1;
    ensureAutoClock();
    ensureFlyInput();
    // I5: the stored motion preference applies to the sky itself, not just the
    // button's label — a returning viewer lands still if that is how they left.
    if (readMotionPaused()) setPaused(true);
    return () => stopAutoClock();
  }, []);

  useEffect(() => {
    // Dev-only QA hooks — see scripts/qa/enter-capture.mjs (no production cost).
    void import("@/lib/dev-qa").then((m) => m.installQaHooks());
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
      id="main-content"
      className="vault-stage relative overflow-hidden bg-bg text-fg"
      style={{ background: "#0c0b0a", color: "#efe8dc" }}
      tabIndex={-1}
    >
      {Scene && !sceneFailed ? (
        <SceneErrorBoundary
          fallback={
            <Suspense fallback={null}>
              <FallbackSky note={FALLBACK_NOTE} />
            </Suspense>
          }
        >
          <Scene />
        </SceneErrorBoundary>
      ) : (
        <Suspense fallback={null}>
          {/* Reduced motion chose the 2D sky on purpose — only a real
              WebGL failure gets the "could not load" note. */}
          <FallbackSky note={prefersReducedMotion() ? undefined : FALLBACK_NOTE} />
        </Suspense>
      )}
      {showStarBack ? <StarBack /> : null}
      {gate === "galaxy" ? <GalaxyShell /> : null}
      {gate === "claim" ? <ClaimShell /> : null}
      {gate === "library" ? <LibraryShell /> : null}
      {gate === "natal" ? <NatalShell /> : null}
    </main>
  );
}
