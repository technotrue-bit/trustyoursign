import { useEffect, useRef } from "react";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { insightToneLabel } from "@/lib/galaxy/signInsights";
import { getSignGalaxy } from "@/lib/galaxy/signGalaxy";
import { useGalaxy } from "@/lib/galaxy/store";
import {
  consumeClaimPrompt,
  exitSignGalaxy,
  seekGalaxyPoint,
  skipEnterGalaxy,
} from "@/lib/galaxy/travel";
import { useSessionStore } from "@/lib/chart/session";
import { useSignExploreAccess } from "@/hooks/useSignExploreAccess";
import { Gloss } from "./Gloss";
import { AuthSlot } from "./AuthSlot";
import { cn } from "@/lib/utils";

/** HUD while diving into / exploring a selected sign’s animal-star galaxy. */
export function SignGalaxyHud() {
  const explore = useGalaxy((s) => s.explore);
  const openClaim = useSessionStore((s) => s.openClaim);
  const claim = useSessionStore((s) => s.claim);
  const prompted = useRef(false);

  const sign =
    explore.signIndex != null ? (CONSTELLATIONS[explore.signIndex] ?? null) : null;
  const { unlocked } = useSignExploreAccess(sign?.id ?? null);

  useEffect(() => {
    prompted.current = false;
  }, [explore.signIndex]);

  useEffect(() => {
    if (explore.phase !== "inside" || !sign) return;
    if (unlocked) {
      consumeClaimPrompt();
      return;
    }
    if (claim) return;
    if (!consumeClaimPrompt() && prompted.current) return;
    prompted.current = true;
    // Land on the first star → open birth chart for first-time explorers.
    openClaim(sign.id);
  }, [explore.phase, sign, unlocked, claim, openClaim]);

  if (explore.phase === "idle" || explore.signIndex == null || !sign) return null;

  const galaxy = getSignGalaxy(sign.id);
  const point = galaxy.points[explore.pointIndex] ?? galaxy.points[0];
  const inside = explore.phase === "inside";
  const entering = explore.phase === "fading" || explore.phase === "diving";
  const lockedPoint = Boolean(point && !point.isHub && !unlocked);

  return (
    <div
      data-no-fly
      className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-between px-4 pt-[max(1.25rem,var(--safe-top))] pb-[max(1.25rem,var(--safe-bottom))]"
    >
      {/* Lock the screen for the whole enter dive — only Skip is live. */}
      {entering ? (
        <div
          className="pointer-events-auto absolute inset-0 z-[55]"
          aria-hidden
          onPointerDown={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        />
      ) : null}

      {/* Same top-right Skip slot as the site intro. */}
      {entering ? (
        <div
          data-no-fly
          className="absolute top-[var(--chrome-top)] right-[max(0.5rem,var(--safe-right))] z-[60] flex items-center gap-1"
        >
          <button
            type="button"
            onClick={() => skipEnterGalaxy()}
            className="pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
          >
            Skip
          </button>
          <AuthSlot />
        </div>
      ) : (
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
      )}

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
              {point.isHub
                ? unlocked
                  ? "Home star"
                  : "First star"
                : point.purpose.kind === "hub"
                  ? "Star"
                  : insightToneLabel(point.purpose.kind)}
            </p>
            <h3 className="font-display mt-1 text-xl leading-snug font-medium tracking-tight text-fg italic md:text-2xl">
              {point.purpose.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted md:text-base">
              <Gloss card={false}>
                {lockedPoint
                  ? `This star stays sealed until your ${sign.name} birth chart and profile are complete.`
                  : point.purpose.body}
              </Gloss>
            </p>
          </>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-3">
        {inside ? (
          <div className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-2">
            {galaxy.points.map((p, i) => {
              const locked = !p.isHub && !unlocked;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (locked) return;
                    seekGalaxyPoint(i);
                  }}
                  className={cn(
                    "min-h-10 min-w-10 rounded-sm px-2 text-[0.65rem] tracking-[0.14em] uppercase",
                    i === explore.pointIndex
                      ? "bg-fg/10 text-fg"
                      : locked
                        ? "text-fg-subtle/35"
                        : "text-fg-subtle hover:text-fg",
                  )}
                  aria-label={locked ? `${p.purpose.title} (locked)` : p.purpose.title}
                >
                  {p.isHub ? "●" : locked ? "◌" : "○"}
                </button>
              );
            })}
          </div>
        ) : null}
        {inside && point?.isHub && !unlocked ? (
          <button
            type="button"
            onClick={() => openClaim(sign.id)}
            className="pointer-events-auto sign-claim min-h-12 w-[min(100%,20rem)] px-4 text-xs tracking-[0.22em] text-fg uppercase hover:text-accent"
          >
            Begin birth chart
          </button>
        ) : null}
        {inside && unlocked ? (
          <p className="max-w-sm px-2 text-center text-[0.7rem] tracking-wide text-fg-subtle">
            Your galaxy is open. Each star holds insight, spice, horror, and warning.
          </p>
        ) : null}
      </div>
    </div>
  );
}
