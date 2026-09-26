import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { FeedbackForm } from "./FeedbackForm";

/**
 * Starlight orb in the home HUD’s top-center gap. Opens the same product
 * feedback form as `/contact#feedback` (POST `/api/feedback` → Ultron).
 * The parent row centers this control between the beta chip and Pause.
 */
export function FeedbackOrb() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-no-fly
        className="feedback-orb pointer-events-auto"
        aria-label="Send feedback"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "feedback-orb-dialog" : undefined}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" className="feedback-orb-mark" aria-hidden>
          <path d="M12 1.6 13.85 8.7 21.4 12 13.85 15.3 12 22.4 10.15 15.3 2.6 12 10.15 8.7Z" />
        </svg>
      </button>
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
