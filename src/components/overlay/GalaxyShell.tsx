import { useState } from "react";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { SIGN_INSIGHTS, insightToneLabel } from "@/lib/galaxy/signInsights";
import { useGalaxy, currentConstellation } from "@/lib/galaxy/store";
import { enterSignGalaxy, noteControl, setPaused } from "@/lib/galaxy/travel";
import { readMotionPaused, writeMotionPaused } from "@/lib/ui/motionPreference";
import { skipIntro } from "@/lib/galaxy/intro";
import { cn } from "@/lib/utils";
import { Gloss, GlossRoot, GlossStage } from "./Gloss";
import { SignStrip } from "./SignStrip";
import { AuthSlot } from "./AuthSlot";
import { LegalFooter } from "./LegalFooter";
import { SignGalaxyHud } from "./SignGalaxyHud";
import { siteVersionChrome } from "@/lib/site-version";

export function GalaxyShell() {
  const versionChrome = siteVersionChrome();
  const moved = useGalaxy((s) => s.moved);
  const signIndex = useGalaxy((s) => s.signIndex);
  const born = useGalaxy((s) => s.born);
  const introTitle = useGalaxy((s) => s.introTitle);
  const introChrome = useGalaxy((s) => s.introChrome);
  const introAsk = useGalaxy((s) => s.introAsk);
  const introVeil = useGalaxy((s) => s.introVeil);
  const introSkip = useGalaxy((s) => s.introSkip);
  const introDone = useGalaxy((s) => s.introDone);
  const explorePhase = useGalaxy((s) => s.explore.phase);
  const exploreWorldFade = useGalaxy((s) => s.explore.worldFade);
  const asking = introVeil > 0.04;
  const titleAnimating = !introDone && introTitle > 0.08;
  // I5: motion preference is persisted, so the button opens in the state the
  // viewer left it (VaultApp applies the stored value to the sky on mount).
  const [paused, setPausedState] = useState(
    () => typeof window !== "undefined" && readMotionPaused(),
  );
  const togglePaused = () => {
    const next = !paused;
    setPausedState(next);
    writeMotionPaused(next);
    setPaused(next);
  };
  const sign = CONSTELLATIONS[signIndex] ?? currentConstellation();
  const exploring = explorePhase !== "idle";
  const worldFade = exploring ? exploreWorldFade : 1;

  if (!born) {
    return (
      <div className="vault-overlay pointer-events-none absolute inset-0 z-30">
        <h1 className="sr-only">what&rsquo;s your sign?</h1>
      </div>
    );
  }

  return (
    <div className="vault-overlay pointer-events-none absolute inset-0 z-30">
      <div className="galaxy-vignette" aria-hidden style={{ opacity: worldFade }} />
      {asking ? (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-bg px-6"
          style={{ opacity: introVeil }}
          aria-hidden={introAsk < 0.05}
        >
          <p
            className="font-display text-center text-[clamp(1.75rem,6.4vw,3.5rem)] leading-[1.18] font-medium tracking-tight text-fg italic antialiased"
            style={{ opacity: introAsk }}
          >
            The Universe Asks You…
          </p>
        </div>
      ) : null}
      {!asking && !exploring && worldFade > 0.08 ? (
        <>
          <p
            data-no-fly
            className="pointer-events-none absolute top-[var(--chrome-top)] left-[max(0.5rem,var(--safe-left))] z-[60] max-w-[4.5rem] text-[0.6rem] leading-tight tracking-[0.18em] text-fg-subtle uppercase md:max-w-none"
            style={{ opacity: worldFade }}
            aria-label={versionChrome.ariaLabel}
          >
            {versionChrome.text}
          </p>
          <div
            data-no-fly
            className="absolute top-[var(--chrome-top)] right-[max(0.5rem,var(--safe-right))] z-[60] flex items-center gap-1"
            style={{ opacity: worldFade }}
          >
            <button
              type="button"
              onClick={togglePaused}
              aria-pressed={paused}
              aria-label={paused ? "Resume the sky's motion" : "Pause the sky's motion"}
              className="pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            {introSkip ? (
              <button
                type="button"
                onClick={() => skipIntro()}
                className="pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] text-fg-subtle uppercase hover:text-fg"
              >
                Skip
              </button>
            ) : null}
            <AuthSlot />
          </div>
        </>
      ) : null}

      {exploring ? <SignGalaxyHud /> : null}

      {!exploring ? (
        <GlossRoot>
          <div
            className="galaxy-title-slot absolute top-[var(--chrome-top)] right-20 left-16 text-center md:top-[max(2.5rem,var(--safe-top))] md:right-24 md:left-24"
            onPointerDown={noteControl}
            style={{
              opacity: asking || moved ? undefined : introTitle,
              visibility: asking ? "hidden" : undefined,
              filter: moved || introDone ? undefined : `blur(${(1 - introTitle) * 4}px)`,
            }}
          >
            <div className="relative mx-auto grid min-h-14 place-items-center md:min-h-44">
              {/* Unmount when moved — do not leave Gloss buttons under aria-hidden. */}
              {!moved ? (
                <h1
                  className={cn(
                    "galaxy-title col-start-1 row-start-1 font-display leading-[1.08] font-medium tracking-tight text-fg italic",
                    titleAnimating ? "sign-soft" : "intro-hold",
                  )}
                >
                  <span className="word">what&rsquo;s</span>
                  <span className="word">your</span>
                  <span className="word pointer-events-auto">
                    <Gloss card={false}>sign</Gloss>
                  </span>
                  <span className="word">?</span>
                </h1>
              ) : null}
              {/* Hero value proposition — fades in with the title, gone once the belt moves. */}
              {!moved && !asking && introTitle > 0.3 ? (
                <p className="col-start-1 row-start-2 mx-auto mt-2 max-w-md px-1 text-sm leading-relaxed text-fg-muted md:mt-3 md:text-base">
                  Pick your sign &amp; Begin to explore
                </p>
              ) : null}
              {moved && sign ? (
                <div key={sign.id} className="sign-swap pointer-events-auto col-start-1 row-start-1">
                  <p className="text-[0.65rem] tracking-[0.28em] text-fg-muted uppercase md:text-xs">
                    {sign.month}
                  </p>
                  <h1 className="galaxy-sign-name mt-1 font-display leading-[1.05] font-medium tracking-tight text-fg italic">
                    {sign.name}
                  </h1>
                  <p className="mx-auto mt-2 line-clamp-3 max-w-md px-1 text-sm leading-relaxed text-fg-muted md:mt-3 md:line-clamp-none md:text-base">
                    <Gloss card={false}>{sign.essence}</Gloss>
                  </p>
                </div>
              ) : null}
            </div>
            <GlossStage className="relative z-10 mx-auto mt-3 max-w-md px-2" />
          </div>
        </GlossRoot>
      ) : null}

      <div
        className="galaxy-chrome pointer-events-none absolute inset-x-0 bottom-[var(--chrome-bottom)] flex flex-col items-center gap-1.5 px-3 pb-[max(0.15rem,env(safe-area-inset-bottom,0px))] md:bottom-8 md:gap-3 md:px-0"
        // Leave the tab order while claim/dive chrome owns the screen.
        inert={asking || exploring ? true : undefined}
        style={{
          opacity: asking || exploring ? 0 : introChrome * worldFade,
          animation: "none",
          pointerEvents: asking || exploring ? "none" : undefined,
        }}
      >
        <LegalFooter />
        <SignStrip />
        {moved ? (
          <button
            type="button"
            onClick={() => {
              if (!sign) return;
              enterSignGalaxy(signIndex);
            }}
            className="sign-claim pointer-events-auto inline-flex min-h-11 w-auto items-center px-5 text-xs tracking-[0.22em] text-fg uppercase hover:text-accent active:text-accent md:min-h-12 md:px-6"
          >
            Enter this sign
          </button>
        ) : null}
        <p className="px-2 text-center text-[0.65rem] tracking-wide text-fg-subtle md:px-4 md:text-xs">
          <span className="md:hidden">
            Slide to fly. Tap a sign to choose it, then tap Enter this sign. Swipe names to jump.
          </span>
          <span className="hidden md:inline">
            Slide to fly. Click a sign to choose it, then Enter this sign.
          </span>
        </p>
        <details className="chart-talks pointer-events-auto relative mx-auto w-full max-w-md px-2" data-no-fly>
          <summary className="min-h-11 cursor-pointer list-none text-center text-[0.6rem] tracking-[0.2em] text-fg-subtle uppercase hover:text-fg [&::-webkit-details-marker]:hidden">
            How a chart talks here
          </summary>
          {(() => {
            const sample = SIGN_INSIGHTS.taurus[0];
            if (!sample) return null;
            return (
              <div className="chart-talks-pop absolute inset-x-2 bottom-full z-20 mb-2 rounded-md border border-border bg-bg/95 px-3.5 py-3 text-center shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_8%,transparent),0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm md:px-4 md:py-3.5">
                <p className="text-[0.6rem] tracking-[0.22em] text-fg-subtle uppercase">
                  Sample reading · {insightToneLabel(sample.tone)}
                </p>
                <p className="font-display mt-1.5 text-lg leading-snug text-fg italic">{sample.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{sample.body}</p>
                <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
                  Every sky speaks in four registers — insight, spice, horror, warning. Inside any
                  galaxy, the Tone control decides how dark it gets. Full readings belong to your
                  own birth, not a sample.
                </p>
              </div>
            );
          })()}
        </details>
      </div>
    </div>
  );
}
