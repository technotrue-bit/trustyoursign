import { beatById, followingBeat } from "@/lib/chart/tour";
import { useSession, useTourBeat } from "@/lib/chart/session/hooks";
import { useSessionStore } from "@/lib/chart/session/store";

export function TourGuide() {
  const session = useSession();
  const tourBeat = useTourBeat();
  const nextTour = useSessionStore((s) => s.nextTour);
  const skipTour = useSessionStore((s) => s.skipTour);
  if (session?.chartKey !== "joey" || !tourBeat) return null;
  const beat = beatById(tourBeat);
  if (!beat) return null;
  const more = Boolean(followingBeat(beat.id));
  return (
    <aside
      className="pointer-events-auto panel-enter absolute top-[calc(var(--chrome-top)+4.75rem)] right-3 left-3 z-40 max-w-md md:right-auto md:left-5"
      data-no-fly
    >
      <div className="rounded-xl border border-border bg-bg-elevated/96 p-4 shadow-[var(--shadow-border)] backdrop-blur-sm md:p-5">
        <p className="text-[0.7rem] tracking-[0.22em] text-accent uppercase">{beat.kicker} · Joey</p>
        <h2 className="mt-2 font-display text-2xl tracking-tight text-fg italic">{beat.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{beat.body}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={nextTour}
            className="min-h-11 rounded-md bg-accent px-4 text-xs tracking-[0.18em] text-accent-fg uppercase"
          >
            {more ? "Next room" : "Got it"}
          </button>
          <button
            type="button"
            onClick={skipTour}
            className="min-h-11 px-2 text-xs tracking-[0.18em] text-fg-subtle uppercase hover:text-fg"
          >
            Skip walkthrough
          </button>
        </div>
      </div>
    </aside>
  );
}
