import { useEffect, useRef, useState } from "react";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { SIGN_INSIGHTS, insightToneLabel } from "@/lib/galaxy/signInsights";
import { useGalaxy, currentConstellation } from "@/lib/galaxy/store";
import {
  enterSignGalaxy,
  exploringSign,
  noteControl,
  setPaused,
  skipBirth,
} from "@/lib/galaxy/travel";
import { readMotionPaused, writeMotionPaused } from "@/lib/ui/motionPreference";
import { skipIntro } from "@/lib/galaxy/intro";
import { cn } from "@/lib/utils";
import { Gloss, GlossRoot, GlossStage } from "./Gloss";
import { SignStrip } from "./SignStrip";
import { AuthSlot } from "./AuthSlot";
import { LegalFooter } from "./LegalFooter";
import { SignGalaxyHud } from "./SignGalaxyHud";
import { FeedbackOrb } from "./FeedbackOrb";
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
  const exploring = explorePhase !== "idle";
  const worldFade = exploring ? exploreWorldFade : 1;
  const focusChrome = useRef(false);
  // Header Skip only exists once the top row is on screen. During the ask
  // veil that row is unmounted, so Skip lives in the corner instead.
  const headerSkipSlot = born && !asking && !exploring && worldFade > 0.08;
  const showCornerSkip = !exploring && !headerSkipSlot && (asking || introSkip) && !introDone;
  // Keep the belt out of the tab order until it is actually visible.
  const dockLive = !asking && !exploring && (introDone || introChrome >= 0.35);
  const titleLive = moved || (!asking && introTitle >= 0.35);

  const onSkipIntro = () => {
    if (!skipIntro({ explicit: true })) return;
    focusChrome.current = true;
  };

  useEffect(() => {
    if (!focusChrome.current || !introDone) return;
    focusChrome.current = false;
    document.getElementById("sky-chrome")?.focus({ preventScroll: true });
  }, [introDone]);
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

  useEffect(() => {
    document.documentElement.classList.toggle("sky-paused", paused);
    return () => document.documentElement.classList.remove("sky-paused");
  }, [paused]);

  const sign = CONSTELLATIONS[signIndex] ?? currentConstellation();

  if (!born) {
    return (
      <div className="vault-overlay pointer-events-none absolute inset-0 z-30">
        <h1 className="sr-only">what&rsquo;s your sign?</h1>
      </div>
    );
  }

  return (
    <div className="vault-overlay pointer-events-none absolute inset-0 z-30">
      {showCornerSkip ? (
        <div className="pointer-events-none absolute top-[var(--chrome-top)] right-[max(0.5rem,var(--safe-right))] z-[70]">
          <button
            type="button"
            data-no-fly
            onClick={onSkipIntro}
            className="sky-hud-btn pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] uppercase"
            aria-label="Skip the introduction"
          >
            Skip
          </button>
        </div>
      ) : null}
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
        <header
          data-no-fly
          aria-label="Sky controls"
          className="pointer-events-none absolute inset-x-0 top-[var(--chrome-top)] z-[60] grid h-[var(--hud-row)] grid-cols-[auto_minmax(2.75rem,1fr)_auto] items-center gap-x-2 px-[max(0.5rem,var(--safe-left))] pr-[max(0.5rem,var(--safe-right))]"
          style={{ opacity: worldFade }}
        >
          <p
            className="sky-hud-kicker sky-hud-veil sky-hud-veil--tight pointer-events-none flex max-w-[4.75rem] items-center text-[0.62rem] leading-tight tracking-[0.18em] uppercase md:max-w-none"
            aria-label={versionChrome.ariaLabel}
          >
            {versionChrome.text}
          </p>
          <div className="flex justify-center">
            <FeedbackOrb />
          </div>
          <div data-no-fly className="flex items-center gap-2 md:gap-1">
            <button
              type="button"
              onClick={togglePaused}
              aria-pressed={paused}
              aria-label={paused ? "Resume the sky's motion" : "Pause the sky's motion"}
              className="sky-hud-btn sky-hud-veil sky-hud-veil--chip pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] uppercase"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            {introSkip ? (
              <button
                type="button"
                data-no-fly
                onClick={onSkipIntro}
                className="sky-hud-btn sky-hud-veil sky-hud-veil--chip pointer-events-auto min-h-11 px-3 text-xs tracking-[0.2em] uppercase"
                aria-label="Skip the introduction"
              >
                Skip
              </button>
            ) : null}
            <AuthSlot />
          </div>
        </header>
      ) : null}

      {exploring ? <SignGalaxyHud /> : null}

      {!exploring ? (
        <GlossRoot>
          <div
            className="galaxy-title-slot absolute inset-x-0 top-[var(--hud-below-row)] px-4 text-center md:right-24 md:left-24 md:px-0"
            onPointerDown={noteControl}
            inert={!titleLive ? true : undefined}
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
                <p className="sky-hud-sub sky-hud-veil sky-hud-veil--tight col-start-1 row-start-2 mx-auto mt-2 max-w-md px-1 text-sm leading-relaxed md:mt-3 md:text-[0.95rem]">
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
        className="galaxy-chrome pointer-events-none absolute inset-x-0 bottom-[var(--hud-bottom)] flex flex-col items-center gap-1.5 px-3 pb-[max(0.15rem,env(safe-area-inset-bottom,0px))] md:bottom-8 md:gap-3 md:px-0"
        // Leave the tab order while the belt is invisible or another surface owns the screen.
        inert={!dockLive ? true : undefined}
        style={{
          opacity: asking || exploring ? 0 : introChrome * worldFade,
          animation: "none",
          pointerEvents: dockLive ? undefined : "none",
        }}
      >
        <LegalFooter />
        <nav
          id="sky-chrome"
          aria-label="Choose a sign"
          tabIndex={-1}
          className="flex w-full flex-col items-center gap-1.5 outline-none md:gap-3"
        >
          <p className="sr-only">Arrow keys move between signs. Then choose Enter this sign.</p>
          <SignStrip />
          {moved ? (
            <button
              type="button"
              onClick={() => {
                if (!sign) return;
                if (enterSignGalaxy(signIndex) || exploringSign()) return;
                // Refused only while the intro/birth is still playing — the tap
                // is the viewer's answer to that, so finish it and go.
                skipIntro({ explicit: true });
                skipBirth();
                useGalaxy.getState().markBorn();
                enterSignGalaxy(signIndex);
              }}
              aria-label={sign ? `Enter this sign, ${sign.name}` : "Enter this sign"}
              className="sign-claim pointer-events-auto inline-flex min-h-11 w-auto items-center px-5 text-xs tracking-[0.22em] text-fg uppercase hover:text-accent active:text-accent md:min-h-12 md:px-6"
            >
              Enter this sign
            </button>
          ) : null}
        </nav>
        <p className="sky-hud-kicker px-2 text-center text-[0.68rem] tracking-wide md:px-4 md:text-xs">
          <span className="md:hidden">
            Slide to fly. Tap a sign to choose it, then tap Enter this sign. Swipe names to jump.
          </span>
          <span className="hidden md:inline">
            Slide to fly. Click a sign, or use the arrow keys, then Enter this sign.
          </span>
        </p>
        <details className="chart-talks pointer-events-auto relative mx-auto w-full max-w-md px-2" data-no-fly>
          <summary className="sky-hud-kicker min-h-11 cursor-pointer list-none text-center tracking-[0.2em] uppercase hover:text-fg [&::-webkit-details-marker]:hidden">
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
