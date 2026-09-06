import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { getSignGalaxy } from "@/lib/galaxy/signGalaxy";
import { useGalaxy } from "@/lib/galaxy/store";
import { exitSignGalaxy, seekGalaxyPoint } from "@/lib/galaxy/travel";
import { useSessionStore } from "@/lib/chart/session";
import { Gloss } from "./Gloss";
import { cn } from "@/lib/utils";

/** HUD while diving into / exploring a selected sign’s animal-star galaxy. */
export function SignGalaxyHud() {
  const explore = useGalaxy((s) => s.explore);
  const openClaim = useSessionStore((s) => s.openClaim);
  if (explore.phase === "idle" || explore.signIndex == null) return null;

  const sign = CONSTELLATIONS[explore.signIndex];
  if (!sign) return null;
  const galaxy = getSignGalaxy(sign.id);
  const point = galaxy.points[explore.pointIndex] ?? galaxy.points[0];
  const inside = explore.phase === "inside";
  const entering = explore.phase === "fading" || explore.phase === "diving";

  return (
    <div
      data-no-fly
      className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-between px-4 pt-[max(1.25rem,var(--safe-top))] pb-[max(1.25rem,var(--safe-bottom))]"
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => exitSignGalaxy()}
          className="pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
        >
          Back
        </button>
        <div className="text-right">
          <p className="text-[0.65rem] tracking-[0.28em] text-fg-muted uppercase">{sign.month}</p>
          <h2 className="font-display text-2xl leading-tight font-medium tracking-tight text-fg italic md:text-3xl">
            {sign.name}
          </h2>
        </div>
      </div>

      <div
        className={cn(
          "mx-auto w-full max-w-md text-center transition-opacity duration-700",
          entering ? "opacity-40" : "opacity-100",
        )}
      >
        {entering ? (
          <p className="text-sm tracking-wide text-fg-muted">Entering the form…</p>
        ) : point ? (
          <>
            <p className="text-[0.65rem] tracking-[0.28em] text-fg-subtle uppercase">
              {point.isHub ? "Claim" : point.purpose.kind}
            </p>
            <h3 className="font-display mt-1 text-xl leading-snug font-medium tracking-tight text-fg italic md:text-2xl">
              {point.purpose.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted md:text-base">
              <Gloss card={false}>{point.purpose.body}</Gloss>
            </p>
          </>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-3">
        {inside ? (
          <div className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-2">
            {galaxy.points.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => seekGalaxyPoint(i)}
                className={cn(
                  "min-h-10 min-w-10 rounded-sm px-2 text-[0.65rem] tracking-[0.14em] uppercase",
                  i === explore.pointIndex
                    ? "bg-fg/10 text-fg"
                    : "text-fg-subtle hover:text-fg",
                )}
                aria-label={p.purpose.title}
              >
                {p.isHub ? "●" : "○"}
              </button>
            ))}
          </div>
        ) : null}
        {inside && point?.isHub ? (
          <button
            type="button"
            onClick={() => openClaim(sign.id)}
            className="pointer-events-auto sign-claim min-h-12 w-[min(100%,20rem)] px-4 text-xs tracking-[0.22em] text-fg uppercase hover:text-accent"
          >
            This is my sign
          </button>
        ) : null}
      </div>
    </div>
  );
}
