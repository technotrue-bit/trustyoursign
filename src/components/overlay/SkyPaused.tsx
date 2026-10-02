/**
 * Shown when the picture card lets go of the sky. A tap mounts a fresh canvas;
 * the page itself stays put.
 */
export function SkyPaused({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-0 z-[80] grid place-items-center px-6"
    >
      <button
        type="button"
        data-sky-cta
        data-no-fly
        autoFocus
        onClick={onRetry}
        className="pointer-events-auto min-h-12 rounded-full border border-[#c9a15b]/50 bg-[#0c0b0a]/94 px-6 text-xs tracking-[0.16em] text-[#f5efe3] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
      >
        Sky paused — tap to retry
      </button>
    </div>
  );
}
