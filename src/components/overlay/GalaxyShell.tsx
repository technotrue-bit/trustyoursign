import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { useGalaxy, currentConstellation } from "@/lib/galaxy/store";
import { enterSignGalaxy, noteControl } from "@/lib/galaxy/travel";
import { skipIntro } from "@/lib/galaxy/intro";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/chart/session";
import { Gloss, GlossRoot, GlossStage } from "./Gloss";
import { SignStrip } from "./SignStrip";
import { AuthSlot } from "./AuthSlot";
import { LegalFooter } from "./LegalFooter";
import { SignGalaxyHud } from "./SignGalaxyHud";

export function GalaxyShell() {
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
  const openClaim = useSessionStore((s) => s.openClaim);
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
        <div
          data-no-fly
          className="absolute top-[var(--chrome-top)] right-[max(0.5rem,var(--safe-right))] z-[60] flex items-center gap-1"
          style={{ opacity: worldFade }}
        >
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
      ) : null}

      {exploring ? <SignGalaxyHud /> : null}

      {!exploring ? (
        <GlossRoot>
          <div
            className="galaxy-title-slot absolute top-[var(--chrome-top)] right-16 left-16 text-center md:top-[max(2.5rem,var(--safe-top))] md:right-24 md:left-24"
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
              {moved && sign ? (
                <div key={sign.id} className="sign-swap pointer-events-auto col-start-1 row-start-1">
                  <button
                    type="button"
                    onClick={() => enterSignGalaxy(signIndex)}
                    className="w-full min-h-11"
                  >
                    <p className="text-[0.65rem] tracking-[0.28em] text-fg-muted uppercase md:text-xs">
                      {sign.month}
                    </p>
                    <h1 className="galaxy-sign-name mt-1 font-display leading-[1.05] font-medium tracking-tight text-fg italic">
                      {sign.name}
                    </h1>
                  </button>
                  <p className="mx-auto mt-2 line-clamp-3 max-w-md px-1 text-sm leading-relaxed text-fg-muted md:mt-3 md:line-clamp-none md:text-base">
                    <Gloss card={false}>{sign.essence}</Gloss>
                  </p>
                  {sign.id === "sagittarius" ? (
                    <p className="mt-3">
                      <a
                        href="/?mesh=sagittarius"
                        className="text-[0.65rem] tracking-[0.22em] text-fg-subtle uppercase underline-offset-4 hover:text-accent hover:underline"
                      >
                        Review 3D mesh
                      </a>
                    </p>
                  ) : null}
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
        <p className="px-2 text-center text-[0.65rem] tracking-wide text-fg-subtle md:px-4 md:text-xs">
          <span className="md:hidden">
            Slide to fly. Tap the sign to enter. Swipe names to jump.
          </span>
          <span className="hidden md:inline">
            Slide to fly. Click the selected sign to enter its galaxy.
          </span>
        </p>
        <button
          type="button"
          disabled={!moved}
          onClick={() => {
            if (!sign) return;
            enterSignGalaxy(signIndex);
          }}
          className={cn(
            "pointer-events-auto hidden min-h-11 w-auto px-4 text-xs tracking-[0.22em] uppercase md:inline-flex md:items-center",
            moved
              ? "sign-claim text-fg hover:text-accent active:text-accent"
              : "cursor-not-allowed border border-border/80 bg-bg-subtle/40 text-fg-muted",
          )}
        >
          {moved ? "Enter this sign" : "Slide to choose a sign"}
        </button>
        <button
          type="button"
          disabled={!moved}
          onClick={() => sign && openClaim(sign.id)}
          className={cn(
            "pointer-events-auto min-h-12 w-[min(100%,20rem)] px-4 text-xs tracking-[0.22em] uppercase md:min-h-10 md:w-auto md:px-3 md:text-[0.65rem] md:tracking-[0.18em]",
            moved ? "sign-claim text-fg hover:text-accent" : "cursor-not-allowed text-fg-muted",
          )}
        >
          This is my sign
        </button>
      </div>
    </div>
  );
}
