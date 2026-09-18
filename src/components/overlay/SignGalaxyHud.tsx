import { Link } from "@tanstack/react-router";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { insightToneLabel } from "@/lib/galaxy/signInsights";
import { getSignGalaxy } from "@/lib/galaxy/signGalaxy";
import type { PointPurposeKind } from "@/lib/galaxy/signGalaxy";
import { guestPreviewUnlocked } from "@/lib/galaxy/exploreAccess";
import { useGalaxy } from "@/lib/galaxy/store";
import { exitSignGalaxy, seekGalaxyPoint, skipEnterGalaxy } from "@/lib/galaxy/travel";
import { useSessionStore } from "@/lib/chart/session";
import { MIN_AGE } from "@/lib/legal";
import { genreSealedByTone, useViewerTone } from "@/lib/ui/viewerTone";
import { useSignExploreAccess } from "@/hooks/useSignExploreAccess";
import { Gloss } from "./Gloss";
import { AuthSlot } from "./AuthSlot";
import { cn } from "@/lib/utils";
import { useEffect, type CSSProperties } from "react";

/** Genre label that tolerates the hub kind (TS cannot prove non-hub points never carry it). */
function kindLabel(kind: PointPurposeKind): string {
  return kind === "hub" ? "Star" : insightToneLabel(kind);
}

/** HUD while diving into / exploring a selected sign’s animal-star galaxy. */
export function SignGalaxyHud() {
  const explore = useGalaxy((s) => s.explore);
  const openClaim = useSessionStore((s) => s.openClaim);

  const sign = explore.signIndex != null ? (CONSTELLATIONS[explore.signIndex] ?? null) : null;
  const galaxy = sign ? getSignGalaxy(sign.id) : null;
  const point = galaxy ? (galaxy.points[explore.pointIndex] ?? galaxy.points[0] ?? null) : null;
  const { unlocked, pointUnlocked, pointLockReason, hasChart, signedIn } = useSignExploreAccess(
    sign?.id ?? null,
    { pointIndex: explore.pointIndex, isHub: point?.isHub ?? false },
  );
  const viewerTone = useViewerTone((s) => s.tone);
  const setViewerTone = useViewerTone((s) => s.setTone);
  const hydrateTone = useViewerTone((s) => s.hydrateTone);

  useEffect(() => {
    hydrateTone();
  }, [hydrateTone]);

  if (explore.phase === "idle" || explore.signIndex == null || !sign || !galaxy) return null;

  const inside = explore.phase === "inside";
  const phaseEntering = explore.phase === "fading" || explore.phase === "diving";
  const entering = phaseEntering || explore.skipPhase !== "idle";
  /** Non-hub star still behind a gate (legacy; lore is open for everyone). */
  const lockedPoint = Boolean(point && !point.isHub && !unlocked && pointLockReason != null);
  /** Star held shut only by the Warm tone setting (horror register). */
  const toneSealed = Boolean(
    point && !point.isHub && !lockedPoint && genreSealedByTone(viewerTone, point.purpose.kind),
  );
  const sealedCopy =
    pointLockReason === "auth"
      ? `Sign in or create an account, then keep a full ${sign.name} birth chart to open this star.`
      : `This star stays sealed until your ${sign.name} birth chart and profile are complete.`;
  const hubTone = pointUnlocked ? "Home star" : "First star";
  const hubTitle = point?.purpose.title ?? "";
  const hubBody = point?.purpose.body ?? "";
  /** Offer natal claim until they already have a timed chart for this sign. */
  const offerBirthChart = Boolean(inside && point?.isHub && !hasChart);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* Lock the screen for the whole enter dive — only Skip is live. */}
      {entering ? (
        <div
          data-no-fly
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
          {phaseEntering && explore.skipPhase === "idle" ? (
            <button
              type="button"
              onClick={() => skipEnterGalaxy()}
              className="pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
            >
              Skip
            </button>
          ) : null}
          <AuthSlot />
        </div>
      ) : null}

      <div
        // inert alone — never combine aria-hidden with Back / AuthSlot / CTAs.
        inert={!inside ? true : undefined}
        className={cn(
          "absolute inset-0 flex flex-col px-4 pt-[max(1.25rem,var(--safe-top))] pb-[max(1.25rem,var(--safe-bottom))] transition-opacity duration-[350ms]",
          inside ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="grid shrink-0 grid-cols-[minmax(4.75rem,auto)_minmax(0,1fr)_minmax(4.75rem,auto)] items-start gap-x-3 gap-y-1">
          <div className="justify-self-start">
            <button
              type="button"
              onClick={() => exitSignGalaxy()}
              className="chrome-glow back-to-sky pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] uppercase"
            >
              Back
            </button>
          </div>
          <div className="min-w-0 px-1 text-center">
            <p className="text-[0.65rem] tracking-[0.28em] text-fg-muted uppercase">{sign.month}</p>
            <h2 className="font-display text-2xl leading-tight font-medium tracking-tight text-fg italic md:text-3xl">
              {sign.name}
            </h2>
          </div>
          <div className="pointer-events-auto flex min-h-11 min-w-[4.75rem] justify-end justify-self-end">
            <AuthSlot />
          </div>
        </div>

        <div className="min-h-0 flex-1" aria-hidden />

        <div
          className={cn(
            "sign-galaxy-lower flex shrink-0 flex-col items-center gap-4 transition-[transform,opacity] duration-500 ease-out",
            inside ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
          )}
        >
          {inside && point ? (
            <div className="sign-galaxy-copy mx-auto w-full max-w-md text-center">
              <p className="sign-galaxy-copy-kicker text-[0.65rem] tracking-[0.28em] uppercase">
                {point.isHub
                  ? hubTone
                  : lockedPoint
                    ? "Sealed"
                    : toneSealed
                      ? `${kindLabel(point.purpose.kind)} · held`
                      : point.purpose.kind === "hub"
                        ? "Star"
                        : insightToneLabel(point.purpose.kind)}
              </p>
              <h3 className="sign-galaxy-copy-title font-display mt-1 text-xl leading-snug font-medium tracking-tight italic md:text-2xl">
                {point.isHub ? hubTitle : lockedPoint ? "Still sealed" : point.purpose.title}
              </h3>
              <p className="sign-galaxy-copy-body mt-2 text-sm leading-relaxed md:text-base">
                <Gloss card={false}>
                  {point.isHub
                    ? hubBody
                    : lockedPoint
                      ? sealedCopy
                      : toneSealed
                        ? "This star speaks in a horror register. It stays shut while your tone is Warm — switch to Full when you want the dark version."
                        : point.purpose.body}
                </Gloss>
              </p>
              {point.isHub && offerBirthChart && !signedIn ? (
                <ul className="mt-3 space-y-1 text-xs text-fg-subtle">
                  <li>We don&apos;t sell your data.</li>
                  <li>Your charts don&apos;t train public models.</li>
                  <li>Birth dates stay on your account and can be deleted.</li>
                  <li>An account exists to save your sky and continue on another device.</li>
                </ul>
              ) : null}
              {point.isHub ? (
                <p className="mt-3 text-[0.65rem] tracking-[0.18em] text-fg-subtle uppercase">
                  Drag to look around. Tap a star to move.
                </p>
              ) : null}
              {toneSealed ? (
                <button
                  type="button"
                  onClick={() => setViewerTone("vault")}
                  className="pointer-events-auto mt-3 min-h-11 rounded-md border border-border px-4 text-xs tracking-[0.18em] text-fg-muted uppercase hover:text-fg"
                >
                  Open dark stars — Full tone
                </button>
              ) : null}
              {!lockedPoint && !toneSealed && !point.isHub ? (
                <p className="mt-3 text-[0.6rem] leading-snug text-fg-subtle">
                  Readings are cultural entertainment, not medical, legal, or psychological advice. <Link to="/terms" className="underline hover:text-fg">Terms</Link>. {MIN_AGE}+.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-3">
            {inside ? (
              <div className="sign-galaxy-dots pointer-events-auto" role="group" aria-label="Star points">
                {galaxy.points.map((p, i) => {
                  const sealed = !p.isHub && !unlocked && !guestPreviewUnlocked(i, p.isHub);
                  const dark = !p.isHub && !sealed && genreSealedByTone(viewerTone, p.purpose.kind);
                  const shut = sealed || dark;
                  const active = i === explore.pointIndex;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => seekGalaxyPoint(i)}
                      style={{ "--i": i } as CSSProperties}
                      className={cn(
                        "sign-galaxy-dot",
                        p.isHub && "sign-galaxy-dot--hub",
                        shut && "sign-galaxy-dot--sealed",
                        !p.isHub && !shut && "sign-galaxy-dot--open",
                        active && "sign-galaxy-dot--active",
                      )}
                      aria-current={active ? "true" : undefined}
                      aria-label={`${p.purpose.title} · ${p.isHub ? "Home star" : kindLabel(p.purpose.kind)}${sealed ? " · sealed" : ""}${dark ? " · dark, tone is Warm" : ""}`}
                    >
                      <span aria-hidden>{p.isHub ? "●" : shut ? "◌" : "○"}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            {inside && point ? (
              <p className="text-[0.6rem] tracking-[0.18em] text-fg-subtle uppercase">
                Star {Math.min(explore.pointIndex + 1, galaxy.points.length)} of {galaxy.points.length}
              </p>
            ) : null}
            {inside ? (
              <div
                className="pointer-events-auto flex items-center gap-3 text-[0.6rem] tracking-[0.18em] uppercase"
                role="group"
                aria-label="Reading tone"
                data-no-fly
              >
                <span className="text-fg-subtle" aria-hidden>
                  Tone
                </span>
                <button
                  type="button"
                  aria-pressed={viewerTone === "warm"}
                  onClick={() => setViewerTone("warm")}
                  className={cn(
                    "min-h-9 px-2",
                    viewerTone === "warm" ? "text-fg" : "text-fg-subtle hover:text-fg",
                  )}
                >
                  Warm
                </button>
                <button
                  type="button"
                  aria-pressed={viewerTone === "vault"}
                  onClick={() => setViewerTone("vault")}
                  className={cn(
                    "min-h-9 px-2",
                    viewerTone === "vault" ? "text-fg" : "text-fg-subtle hover:text-fg",
                  )}
                >
                  Full
                </button>
                <span className="sr-only" aria-live="polite">
                  {viewerTone === "warm"
                    ? "Tone Warm. Dark horror stars stay sealed."
                    : "Tone Full. All star registers are open."}
                </span>
              </div>
            ) : null}
            {inside && point ? (
              <p className="sr-only" aria-live="polite">
                {`At ${point.purpose.title}. ${point.isHub ? "Home star" : lockedPoint ? "Sealed until your chart is kept" : kindLabel(point.purpose.kind)}. Star ${explore.pointIndex + 1} of ${galaxy.points.length}.`}
              </p>
            ) : null}
            {offerBirthChart ? (
              <button
                type="button"
                onClick={() => openClaim(sign.id)}
                className="pointer-events-auto sign-claim min-h-12 w-[min(100%,20rem)] px-4 text-xs tracking-[0.22em] text-fg uppercase hover:text-accent"
              >
                Begin birth chart
              </button>
            ) : null}
            {inside && unlocked && hasChart ? (
              <p className="sign-galaxy-copy-body max-w-sm px-2 text-center text-[0.7rem] tracking-wide">
                Your galaxy is open. Each star holds insight, spice, horror, and warning.
                {viewerTone === "warm" ? " Dark stars stay shut until you switch tone to Full." : ""}
              </p>
            ) : null}
            {inside && unlocked && !hasChart ? (
              <p className="sign-galaxy-copy-body max-w-sm px-2 text-center text-[0.7rem] tracking-wide">
                Every star is open — read the sign here, or begin a birth chart for your own sky.
                {viewerTone === "warm" ? " Dark stars stay shut until you switch tone to Full." : ""}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {explore.skipVeil > 0.001 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[70] bg-black"
          style={{ opacity: explore.skipVeil }}
        />
      ) : null}
    </div>
  );
}
