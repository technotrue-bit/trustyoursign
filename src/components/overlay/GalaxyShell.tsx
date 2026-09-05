import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { useGalaxy, currentConstellation } from "@/lib/galaxy/store";
import { noteControl } from "@/lib/galaxy/travel";
import { skipIntro } from "@/lib/galaxy/intro";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/chart/session";
import { Gloss, GlossRoot, GlossStage } from "./Gloss";
import { SignStrip } from "./SignStrip";
import { AuthSlot } from "./AuthSlot";
import { LegalFooter } from "./LegalFooter";

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
  const asking = introVeil > 0.04;
  const titleAnimating = !introDone && introTitle > 0.08;
  const openClaim = useSessionStore((s) => s.openClaim);
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
      <div className="galaxy-vignette" aria-hidden />
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
      {!asking ? (
        <div
          data-no-fly
          className="absolute top-[var(--chrome-top)] right-[max(0.5rem,var(--safe-right))] z-[60] flex items-center gap-1"
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
            <h1
              className={cn(
                "galaxy-title col-start-1 row-start-1 font-display leading-[1.08] font-medium tracking-tight text-fg italic",
                titleAnimating ? "sign-soft" : "intro-hold",
                "transition-[opacity,filter] duration-500 ease-out",
                moved ? "pointer-events-none opacity-0 blur-sm" : "opacity-100",
              )}
              aria-hidden={moved}
            >
              <span className="word">what&rsquo;s</span>
              <span className="word">your</span>
              <span className="word pointer-events-auto">
                <Gloss card={false}>sign</Gloss>
              </span>
              <span className="word">?</span>
            </h1>
            {moved && sign ? (
              <div key={sign.id} className="sign-swap pointer-events-auto col-start-1 row-start-1">
                <button
                  type="button"
                  onClick={() => openClaim(sign.id)}
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

      <div
        className="galaxy-chrome pointer-events-none absolute inset-x-0 bottom-[var(--chrome-bottom)] flex flex-col items-center gap-2 md:bottom-8 md:gap-3"
        style={{ opacity: asking ? 0 : introChrome, animation: "none" }}
      >
        <LegalFooter />
        <SignStrip />
        <p className="px-4 text-center text-[0.7rem] tracking-wide text-fg-subtle md:text-xs">
          <span className="md:hidden">
            Slide to fly. Pinch to zoom the sign. Swipe the names to jump.
          </span>
          <span className="hidden md:inline">
            Slide up and down to fly. Scroll to pass through the signs.
          </span>
        </p>
        <button
          type="button"
          disabled={!moved}
          onClick={() => sign && openClaim(sign.id)}
          className={cn(
            "pointer-events-auto min-h-12 w-[min(100%,20rem)] px-4 text-xs tracking-[0.22em] uppercase md:min-h-11 md:w-auto",
            moved
              ? "sign-claim text-fg hover:text-accent active:text-accent"
              : "text-fg-subtle/50 transition-colors duration-150",
          )}
        >
          This is my sign
        </button>
      </div>
    </div>
  );
}
