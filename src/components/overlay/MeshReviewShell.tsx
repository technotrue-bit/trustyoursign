import { MeshReviewCanvas } from "@/components/scene/MeshReviewCanvas";
import { SceneErrorBoundary } from "@/components/scene-error-boundary";

function leaveReview() {
  const url = new URL(window.location.href);
  url.searchParams.delete("mesh");
  window.location.assign(url.pathname + url.search + url.hash);
}

/**
 * Chrome around the Sagittarius mesh review stage.
 * Entry: `/?mesh=sagittarius`. Plates / GalaxyIntro stay untouched.
 */
export function MeshReviewShell() {
  return (
    <main
      className="vault-stage relative overflow-hidden bg-bg text-fg"
      style={{ background: "#050403", color: "#efe8dc" }}
    >
      <SceneErrorBoundary
        fallback={
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <p className="font-display text-lg text-fg-muted">Mesh review failed to load.</p>
          </div>
        }
      >
        <MeshReviewCanvas />
      </SceneErrorBoundary>

      <div className="pointer-events-none absolute inset-0 z-30">
        <div className="absolute top-[max(1rem,var(--safe-top))] right-4 left-4 flex items-start justify-between gap-3 md:right-6 md:left-6">
          <div className="max-w-[min(28rem,78vw)]">
            <p className="text-[0.65rem] tracking-[0.28em] text-fg-subtle uppercase">Mesh review</p>
            <h1 className="font-display mt-1 text-[clamp(1.35rem,4.2vw,2rem)] leading-tight text-fg italic">
              Sagittarius
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
              Extruded OBJ from Sagittarius-3D with thin-gold albedo. Drag to orbit — judge volume
              against the flat plates before scaling the other eleven.
            </p>
          </div>
          <button
            type="button"
            onClick={leaveReview}
            className="pointer-events-auto min-h-11 shrink-0 rounded-md border border-border/80 bg-bg-elevated/80 px-3 text-xs tracking-[0.18em] text-fg-muted uppercase backdrop-blur-sm hover:border-accent/40 hover:text-fg"
          >
            Back to Vault
          </button>
        </div>
        <p className="absolute bottom-[max(1rem,var(--safe-bottom))] left-1/2 -translate-x-1/2 text-[0.65rem] tracking-[0.22em] text-fg-subtle uppercase">
          Drag · scroll zoom · auto-orbit
        </p>
      </div>
    </main>
  );
}

export function wantsMeshReview(search = "") {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("mesh");
  return q === "sagittarius" || q === "1" || q === "sagitarius";
}
