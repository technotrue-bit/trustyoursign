import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { FeedbackForm } from "./FeedbackForm";

/**
 * Starlight orb in the home HUD’s top-center gap. Opens the same product
 * feedback form as `/contact#feedback` (POST `/api/feedback` → Ultron).
 * The parent row centers this control between the beta chip and Pause.
 *
 * On the first mount of a page load the orb eases in, a glass bubble names
 * it (“Send feedback”), and the bubble retracts after it has been out for
 * three seconds. Later mounts in the same document (leaving a sign and
 * coming home) leave the orb settled — the hint is a greeting, not a loop.
 */
let supportHintPlayed = false;

export function FeedbackOrb() {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(() => !supportHintPlayed);

  useLayoutEffect(() => {
    if (hint) supportHintPlayed = true;
    const root = document.documentElement;
    // Phone rows have no empty band beside the orb. While the label is out,
    // the headline eases down so the bubble can sit under the orb’s side
    // without covering the beta chip or the title. See support-hint-room.
    if (hint && !open) root.dataset.supportHint = "";
    else delete root.dataset.supportHint;
    return () => {
      delete root.dataset.supportHint;
    };
  }, [hint, open]);

  useEffect(() => {
    if (!hint || open) return;
    // Reduced motion zeroes CSS animation duration globally, so the label
    // cannot time itself. Hold the still bubble for three seconds, then close it.
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setHint(false), 3000);
    return () => window.clearTimeout(id);
  }, [hint, open]);

  return (
    <>
      <div className="feedback-orb-slot">
        <button
          type="button"
          data-no-fly
          className={`feedback-orb pointer-events-auto${hint ? " feedback-orb--arrive" : ""}`}
          aria-label="Send feedback"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? "feedback-orb-dialog" : undefined}
          onClick={() => {
            setHint(false);
            setOpen(true);
          }}
        >
          {/* Name lives in the button, not only on aria-label. The star is hidden and the bubble is too. */}
          <span className="sr-only">Send feedback</span>
          <svg viewBox="0 0 24 24" className="feedback-orb-mark" aria-hidden="true">
            <path d="M12 1.6 13.85 8.7 21.4 12 13.85 15.3 12 22.4 10.15 15.3 2.6 12 10.15 8.7Z" />
          </svg>
        </button>
        {hint && !open ? (
          <span className="feedback-orb-hint-anchor">
            <span
              className="feedback-orb-hint"
              aria-hidden="true"
              onAnimationEnd={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.animationName === "feedback-orb-hint") setHint(false);
              }}
            >
              Send feedback
            </span>
          </span>
        ) : null}
      </div>
      {open && typeof document !== "undefined"
        ? createPortal(<FeedbackSheet onClose={() => setOpen(false)} />, document.body)
        : null}
    </>
  );
}

function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" data-no-fly>
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-[#070605]/72 backdrop-blur-[2px]"
        aria-label="Close feedback"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center md:inset-0 md:items-center md:p-6">
        <div
          ref={dialogRef}
          id="feedback-orb-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-orb-title"
          tabIndex={-1}
          data-no-fly
          className="feedback-sheet pointer-events-auto relative max-h-[min(88dvh,40rem)] w-full overflow-y-auto rounded-t-[1.35rem] border border-[#c9a15b]/40 bg-[#14110e]/97 px-5 pt-4 pb-[max(1.15rem,env(safe-area-inset-bottom,0px))] shadow-[0_0_0_1px_rgba(201,161,91,0.12),0_24px_60px_rgba(0,0,0,0.55)] outline-none md:max-w-lg md:rounded-[1.35rem] md:pb-5"
        >
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] tracking-[0.28em] text-[#c9a15b] uppercase">To Ultron</p>
              <h2
                id="feedback-orb-title"
                className="mt-1 font-display text-2xl tracking-tight text-fg italic"
              >
                Send feedback
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 shrink-0 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
            >
              Close
            </button>
          </div>
          <p className="text-sm leading-relaxed text-fg-muted">
            A bug, a fix, or a recommendation — the same note{" "}
            <Link to="/contact" hash="feedback" className="text-fg underline" onClick={onClose}>
              product feedback
            </Link>{" "}
            sends to Ultron. Privacy and data requests use the rest of Contact.
          </p>
          <FeedbackForm compact />
        </div>
      </div>
    </div>
  );
}
