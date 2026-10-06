import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { insightToneLabel } from "@/lib/galaxy/signInsights";
import { getSignGalaxy } from "@/lib/galaxy/signGalaxy";
import type { PointPurposeKind } from "@/lib/galaxy/signGalaxy";
import { guestPreviewUnlocked } from "@/lib/galaxy/exploreAccess";
import { useGalaxy } from "@/lib/galaxy/store";
import { exitSignGalaxy, seekGalaxyPoint, skipEnterGalaxy } from "@/lib/galaxy/travel";
import { hasInsideHistoryEntry } from "@/lib/ui/skyPlace";
import { useSessionStore } from "@/lib/chart/session";
import { MIN_AGE } from "@/lib/legal";
import { useSignExploreAccess } from "@/hooks/useSignExploreAccess";
import { Gloss } from "./Gloss";
import { AuthSlot } from "./AuthSlot";
import { MoonSignBriefCard } from "./MoonSignBriefCard";
import { cn } from "@/lib/utils";

/** Genre label that tolerates the hub kind (TS cannot prove non-hub points never carry it). */
function kindLabel(kind: PointPurposeKind): string {
  return kind === "hub" ? "Star" : insightToneLabel(kind);
}

/**
 * True while the box is taller than the room it was given. Only then does the
 * star copy take touches for scrolling; otherwise drags fall through to look.
 */
function useOverflows<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    if (!el || typeof ResizeObserver === "undefined") {
      setOverflows(false);
      return;
    }
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    check();
    return () => ro.disconnect();
  }, [el]);
  return [setEl, overflows] as const;
}

/** HUD while diving into / exploring a selected sign’s animal-star galaxy. */
export function SignGalaxyHud() {
  const explore = useGalaxy((s) => s.explore);
  const openClaim = useSessionStore((s) => s.openClaim);
  const [copyRef, copyScrolls] = useOverflows<HTMLDivElement>();

  const sign = explore.signIndex != null ? (CONSTELLATIONS[explore.signIndex] ?? null) : null;
  const galaxy = sign ? getSignGalaxy(sign.id) : null;
  const point = galaxy ? (galaxy.points[explore.pointIndex] ?? galaxy.points[0] ?? null) : null;
  const { unlocked, pointUnlocked, pointLockReason, hasChart, signedIn } = useSignExploreAccess(
    sign?.id ?? null,
    { pointIndex: explore.pointIndex, isHub: point?.isHub ?? false },
  );
  const inside = explore.phase === "inside";
  const focusAfterSkip = useRef(false);

  useEffect(() => {
    if (!inside || !focusAfterSkip.current) return;
    focusAfterSkip.current = false;
    document.getElementById("sign-galaxy-back")?.focus({ preventScroll: true });
  }, [inside]);

  if (explore.phase === "idle" || explore.signIndex == null || !sign || !galaxy) return null;
  const phaseEntering = explore.phase === "fading" || explore.phase === "diving";
  const entering = phaseEntering || explore.skipPhase !== "idle";
  /** Non-hub star still behind a gate (legacy; lore is open for everyone). */
  const lockedPoint = Boolean(point && !point.isHub && !unlocked && pointLockReason != null);
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
          className="absolute top-[var(--chrome-top)] right-[max(0.5rem,var(--safe-right))] z-[60] flex items-center gap-2 md:gap-1"
        >
          {phaseEntering && explore.skipPhase === "idle" ? (
            <button
              type="button"
              onClick={() => {
                if (!skipEnterGalaxy()) return;
                focusAfterSkip.current = true;
              }}
              className="pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
              aria-label="Skip the entrance"
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
          "absolute inset-0 flex flex-col px-4 pt-[var(--chrome-top)] pb-[var(--hud-bottom)] transition-opacity duration-[350ms] md:pt-[max(1.25rem,var(--safe-top))] md:pb-[max(1.25rem,var(--safe-bottom))]",
          inside ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <header
          aria-label={`${sign.name} galaxy`}
          className="grid shrink-0 grid-cols-[minmax(4.75rem,auto)_minmax(0,1fr)_minmax(4.75rem,auto)] items-start gap-x-3 gap-y-1"
        >
          <div className="justify-self-start">
            <button
              type="button"
              id="sign-galaxy-back"
              onClick={() => {
                // Pop the entry enter pushed, so Back and this button leave the
                // same way. With no prior entry, unwind in place.
                if (hasInsideHistoryEntry()) {
                  window.history.back();
                  return;
                }
                exitSignGalaxy();
              }}
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
        </header>

        <div className="min-h-0 flex-1" aria-hidden />

        <div
          className={cn(
            "sign-galaxy-lower flex min-h-0 flex-col items-center gap-4 transition-[transform,opacity] duration-500 ease-out",
            inside ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
          )}
        >
          {inside && point ? (
            <div
              ref={copyRef}
              className={cn("sign-galaxy-scroll", copyScrolls && "pointer-events-auto")}
              data-no-fly={copyScrolls ? true : undefined}
            >
              <div className="sign-galaxy-copy mx-auto w-full max-w-md text-center">
                <p className="sign-galaxy-copy-kicker text-[0.65rem] tracking-[0.28em] uppercase">
                  {point.isHub
                    ? hubTone
                    : lockedPoint
                      ? "Sealed"
                      : point.purpose.kind === "hub"
                        ? "Star"
                        : insightToneLabel(point.purpose.kind)}
                </p>
                <h3 className="sign-galaxy-copy-title font-display mt-1 text-xl leading-snug font-medium tracking-tight italic md:text-2xl">
                  {point.isHub ? hubTitle : lockedPoint ? "Still sealed" : point.purpose.title}
                </h3>
                <p className="sign-galaxy-copy-body mt-2 text-sm leading-relaxed md:text-base">
                  <Gloss card={false}>
                    {point.isHub ? hubBody : lockedPoint ? sealedCopy : point.purpose.body}
                  </Gloss>
                </p>
                {point.isHub && offerBirthChart && !signedIn ? (
                  <ul className="sign-galaxy-trust mt-3 space-y-1 text-xs text-fg-subtle">
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
                {!lockedPoint && !point.isHub ? (
                  <p className="mt-3 text-[0.6rem] leading-snug text-fg-subtle">
                    Readings are cultural entertainment, not medical, legal, or psychological
                    advice.{" "}
                    <Link to="/terms" className="underline hover:text-fg">
                      Terms
                    </Link>
                    . {MIN_AGE}+.
                  </p>
                ) : null}
                {point.isHub ? <MoonSignBriefCard signId={sign.id} signName={sign.name} /> : null}
              </div>
            </div>
          ) : null}

          <div className="flex shrink-0 flex-col items-center gap-3">
            {inside ? (
              <div className="sign-galaxy-dots pointer-events-auto" role="group" aria-label="Star points">
                {galaxy.points.map((p, i) => {
                  const sealed = !p.isHub && !unlocked && !guestPreviewUnlocked(i, p.isHub);
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
                        sealed && "sign-galaxy-dot--sealed",
                        !p.isHub && !sealed && "sign-galaxy-dot--open",
                        active && "sign-galaxy-dot--active",
                      )}
                      aria-current={active ? "true" : undefined}
                      aria-label={`${p.purpose.title} · ${p.isHub ? "Home star" : kindLabel(p.purpose.kind)}${sealed ? " · sealed" : ""}`}
                    >
                      <span aria-hidden>{p.isHub ? "●" : sealed ? "◌" : "○"}</span>
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
            {inside && point ? (
              <p className="sr-only" aria-live="polite">
                {`At ${point.purpose.title}. ${point.isHub ? "Home star" : lockedPoint ? "Sealed until your chart is kept" : kindLabel(point.purpose.kind)}. Star ${explore.pointIndex + 1} of ${galaxy.points.length}.`}
              </p>
            ) : null}
            {offerBirthChart ? (
              <button
                type="button"
                onClick={() => {
                  // Natal orbit and starfield download with the chart, not the corridor.
                  // Start that file while the birth is entered so the 48ms gate still covers it.
                  void import("@/components/scene/ChartWorld");
                  openClaim(sign.id);
                }}
                data-sky-cta
                aria-label={`Begin birth chart for ${sign.name}`}
                className="pointer-events-auto sign-claim min-h-12 w-[min(100%,20rem)] px-4 text-xs tracking-[0.22em] text-fg uppercase hover:text-accent"
              >
                Begin birth chart
              </button>
            ) : null}
            {inside && unlocked && hasChart ? (
              <p className="sign-galaxy-copy-body max-w-sm px-2 text-center text-[0.7rem] tracking-wide">
                Your galaxy is open. Each star holds insight, spice, horror, and warning.
              </p>
            ) : null}
            {inside && unlocked && !hasChart ? (
              <p className="sign-galaxy-copy-body max-w-sm px-2 text-center text-[0.7rem] tracking-wide">
                Every star is open — read the sign here, or begin a birth chart for your own sky.
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
