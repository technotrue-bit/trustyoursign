import { useEffect, useRef, useState, type ComponentType, lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { signIndexOf } from "@/lib/chart/sign-canon";
import { useGalaxy } from "@/lib/galaxy/store";
import {
  ensureAutoClock,
  ensureFlyInput,
  galaxyTravel,
  prefersReducedMotion,
  restoreInsideSignGalaxy,
  seekSign,
  setPaused,
  skipBirth,
  snapToSign,
  stopAutoClock,
} from "@/lib/galaxy/travel";
import { bootIntro, skipIntro } from "@/lib/galaxy/intro";
import { readGuestDraft } from "@/lib/ui/guestDraft";
import { readMotionPaused } from "@/lib/ui/motionPreference";
import {
  placeFromLiveState,
  placesEqual,
  releaseFailedResearchPlace,
  resolveBootPlace,
  savePlaceSession,
  searchFromPlace,
  type SkyPlace,
  type SkyPlaceSearch,
} from "@/lib/ui/skyPlace";
import { buryWebGLCanvas, canWebGL, shouldUse3D } from "@/lib/gpu";
import { ChunkRecovered } from "@/components/chunk-recovered";
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
  /** Validated home search — used once on boot to restore place after refresh. */
  placeSearch?: SkyPlaceSearch;
};

/** Copy for a `?desk=` deep link the server refused — the tap must not look dead. */
const DESK_LOCKED_NOTE = "That desk isn’t unlocked for this sign-in — flying the open sky.";

/**
 * Apply a boot place. Resolves `false` only when a research deep link could not
 * be opened (owner gate refused, network) so the caller can clear the URL and
 * say so instead of pinning `?desk=` on a sky that never changed.
 */
function applyBootPlace(place: SkyPlace): Promise<boolean> {
  if (place.kind === "home") return Promise.resolve(true);
  skipIntro();
  skipBirth();
  useGalaxy.getState().markBorn();
  if (place.kind === "library") {
    useSessionStore.getState().openLibrary();
    return Promise.resolve(true);
  }
  if (place.kind === "research") {
    return getResearchChart({ data: place.id })
      .then((nat) => {
        const st = useSessionStore.getState();
        st.openResearch(place.id, nat);
        // Account-menu "The sky" deep links land on the planet wheel, not under the sheet.
        st.setMode("sky");
        st.foldSheet(true);
        return true;
      })
      .catch(() => false);
  }
  const index = signIndexOf(place.signId);
  if (index < 0) return Promise.resolve(true);
  if (place.kind === "belt") {
    snapToSign(index);
    return Promise.resolve(true);
  }
  restoreInsideSignGalaxy(index, place.star);
  return Promise.resolve(true);
}

export function VaultApp({ meshParam, placeSearch }: VaultAppProps = {}) {
  const meshReview = wantsMeshReview(meshParam ? `?mesh=${meshParam}` : "");
  const navigate = useNavigate({ from: "/" });
  const placeReady = useRef(false);
  const lastWritten = useRef<SkyPlace | null>(null);
  const [Scene, setScene] = useState<ComponentType | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [deskNotice, setDeskNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  // A research place that fails must let go of the URL: with `?desk=` pinned
  // every refresh re-ran the same refused fetch and the sky never moved.
  const bootPlace = (place: SkyPlace) => {
    lastWritten.current = place;
    void applyBootPlace(place).then((ok) => {
      if (ok || place.kind !== "research") return;
      const released = releaseFailedResearchPlace(lastWritten.current, place.id);
      if (!released) return;
      lastWritten.current = released;
      savePlaceSession(released);
      void navigate({ to: "/", search: (prev) => ({ ...prev, desk: undefined }), replace: true });
      setDeskNotice(DESK_LOCKED_NOTE);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => setDeskNotice(null), 7000);
    });
  };
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

  const moved = useGalaxy((s) => s.moved);
  const signIndex = useGalaxy((s) => s.signIndex);
  const explorePhase = useGalaxy((s) => s.explore.phase);
  const exploreSignIndex = useGalaxy((s) => s.explore.signIndex);
  const pointIndex = useGalaxy((s) => s.explore.pointIndex);
  const researchId = useSessionStore((s) =>
    s.session?.kind === "research" &&
    (s.session.chartKey === "joey" || s.session.chartKey === "saige")
      ? s.session.chartKey
      : null,
  );

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
    // Restore sky place before guest-draft claim so a refresh inside Aries
    // lands back in that galaxy (claim can still open on top).
    const boot = resolveBootPlace(placeSearch ?? {});
    bootPlace(boot);
    placeReady.current = true;

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
    return () => {
      stopAutoClock();
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
    // Boot once from the arrival URL — live sync owns later updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional cold-load restore
  }, []);

  // AccountMenu (and similar) links to `/?desk=…` after the first paint —
  // apply those without requiring a full document reload.
  useEffect(() => {
    if (!placeReady.current) return;
    const desk = placeSearch?.desk;
    if (desk === "library") {
      const st = useSessionStore.getState();
      if (st.surface === "library" && !st.session) return;
      bootPlace({ kind: "library" });
      return;
    }
    if (desk === "joey" || desk === "saige") {
      const st = useSessionStore.getState();
      if (st.session?.kind === "research" && st.session.chartKey === desk) return;
      bootPlace({ kind: "research", id: desk });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootPlace only closes over refs + stable setters
  }, [placeSearch?.desk]);

  useEffect(() => {
    // Dev-only QA hooks — see scripts/qa/enter-capture.mjs (no production cost).
    void import("@/lib/dev-qa").then((m) => m.installQaHooks());
  }, []);

  useEffect(() => {
    galaxyTravel.busy = Boolean(claiming || entered);
    galaxyTravel.claiming = Boolean(claiming);
  }, [claiming, entered]);

  // Keep the address bar + session backup aligned with the live sky so a
  // refresh returns to this place instead of the title screen.
  useEffect(() => {
    if (!placeReady.current || meshReview) return;
    const next = placeFromLiveState({
      surface,
      sessionKind,
      researchId: researchId ?? null,
      explorePhase,
      exploreSignIndex,
      pointIndex,
      moved,
      signIndex,
      signIdAt: (i) => CONSTELLATIONS[i]?.id ?? null,
    });
    if (lastWritten.current && placesEqual(lastWritten.current, next)) return;
    // Research charts load async — don't wipe `?desk=joey` while the fetch is in flight.
    if (
      lastWritten.current?.kind === "research" &&
      next.kind === "home" &&
      sessionKind !== "research"
    ) {
      return;
    }
    lastWritten.current = next;
    savePlaceSession(next);
    const search = searchFromPlace(next, { mesh: placeSearch?.mesh ?? meshParam });
    void navigate({ to: "/", search, replace: true });
  }, [
    surface,
    sessionKind,
    researchId,
    explorePhase,
    exploreSignIndex,
    pointIndex,
    moved,
    signIndex,
    meshReview,
    meshParam,
    placeSearch?.mesh,
    navigate,
  ]);

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
              <ChunkRecovered>
                <FallbackSky note={FALLBACK_NOTE} />
              </ChunkRecovered>
            </Suspense>
          }
        >
          <ChunkRecovered>
            <Scene />
          </ChunkRecovered>
        </SceneErrorBoundary>
      ) : (
        <Suspense fallback={null}>
          {/* Reduced motion chose the 2D sky on purpose — only a real
              WebGL failure gets the "could not load" note. */}
          <ChunkRecovered>
            <FallbackSky note={prefersReducedMotion() ? undefined : FALLBACK_NOTE} />
          </ChunkRecovered>
        </Suspense>
      )}
      {deskNotice ? (
        <p
          role="status"
          className="pointer-events-none absolute inset-x-0 top-[calc(var(--chrome-top)+3.5rem)] z-40 px-6 text-center text-[0.6rem] leading-snug tracking-[0.18em] text-fg-subtle uppercase"
        >
          {deskNotice}
        </p>
      ) : null}
      {showStarBack ? <StarBack /> : null}
      {gate === "galaxy" ? <GalaxyShell /> : null}
      {gate === "claim" ? <ClaimShell /> : null}
      {gate === "library" ? <LibraryShell /> : null}
      {gate === "natal" ? <NatalShell /> : null}
    </main>
  );
}
