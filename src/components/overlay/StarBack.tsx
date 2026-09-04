import { useSessionStore } from "@/lib/chart/session/store";
import { cn } from "@/lib/utils";

export function StarBack({ className }: { className?: string }) {
  const closeSession = useSessionStore((s) => s.close);

  return (
    <button
      type="button"
      onClick={closeSession}
      aria-label="Back"
      className={cn("star-back pointer-events-auto", className)}
    >
      <span className="star-back-glyph" aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M12 1.6 13.25 10.75 22.4 12 13.25 13.25 12 22.4 10.75 13.25 1.6 12 10.75 10.75Z" />
          <path
            d="M12 6.8 12.55 11.45 17.2 12 12.55 12.55 12 17.2 11.45 12.55 6.8 12 11.45 11.45Z"
            opacity="0.55"
          />
        </svg>
      </span>
      <span className="star-back-label">Back</span>
    </button>
  );
}
