import { useEffect, useState, type ComponentType } from "react";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { currentConstellation, useGalaxy } from "@/lib/galaxy/store";
import { ensureAutoClock, ensureFlyInput, galaxyTravel, seekSign, skipBirth } from "@/lib/galaxy/travel";
import { buryWebGLCanvas, canWebGL, shouldUse3D } from "@/lib/gpu";
import { LIBRARY } from "@/lib/chart/nativity";
import { useVault } from "@/lib/store";
import { SceneErrorBoundary } from "../scene-error-boundary";
import { BirthChat } from "./BirthChat";
import { FallbackSky } from "./FallbackSky";
import { SignStrip } from "./SignStrip";

export function VaultApp() {
  const [Scene, setScene] = useState<ComponentType | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const entered = useVault((s) => s.entered);
  const gate = useVault((s) => s.gate);
  const chat = useVault((s) => s.chat);
  const born = useGalaxy((s) => s.born);
  const moved = useGalaxy((s) => s.moved);
  const signIndex = useGalaxy((s) => s.signIndex);
  const sign = CONSTELLATIONS[signIndex] ?? CONSTELLATIONS[0]!;
  const openLibrary = useVault((s) => s.openLibrary);
  const openGalaxy = useVault((s) => s.openGalaxy);
  const openChart = useVault((s) => s.openChart);
  const goBack = useVault((s) => s.goBack);
  const openBirthChat = useVault((s) => s.openBirthChat);

  useEffect(() => {
    if (!shouldUse3D()) {
      setSceneFailed(true);
      return;
    }
    let cancelled = false;
    void import("@/components/scene/ChartCanvas")
      .then((m) => {
        if (!cancelled && canWebGL()) setScene(() => m.ChartCanvas);
        else if (!cancelled) setSceneFailed(true);
      })
      .catch(() => {
        if (!cancelled) setSceneFailed(true);
      });
    const onLost = () => setSceneFailed(true);
    const hideLost = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLCanvasElement && t.closest(".canvas-root")) buryWebGLCanvas(t);
    };
    window.addEventListener("vault-webgl-lost", onLost);
    window.addEventListener("webglcontextlost", hideLost, true);
    return () => {
      cancelled = true;
      window.removeEventListener("vault-webgl-lost", onLost);
      window.removeEventListener("webglcontextlost", hideLost, true);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const st = useVault.getState();
        if (st.selection) st.clear();
        else st.goBack();
      }
      if (e.key === "Enter" && !useVault.getState().entered) {
        const st = useVault.getState();
        if (st.gate === "galaxy") {
          if (st.chat) return;
          if (galaxyTravel.birth < 1) {
            skipBirth();
            useGalaxy.getState().markBorn();
            return;
          }
          const g = useGalaxy.getState();
          if (g.moved) {
            const s = CONSTELLATIONS[g.signIndex];
            if (s) st.openBirthChat(s.id);
          } else st.openLibrary();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    ensureAutoClock();
    ensureFlyInput();
    (window as unknown as { __vault: object }).__vault = {
      skipBirth,
      seekSign,
      galaxyTravel,
    };
    const q = new URLSearchParams(window.location.search);
    if (q.has("skipBirth") || q.has("sign")) {
      skipBirth();
      useGalaxy.getState().markBorn();
      galaxyTravel.moved = true;
      galaxyTravel.awaken = 1;
    }
    const sign = q.get("sign");
    if (sign) {
      const i = CONSTELLATIONS.findIndex((c) => c.id === sign || String(c.name).toLowerCase() === sign.toLowerCase());
      if (i >= 0) seekSign(i);
    }
  }, []);

  useEffect(() => {
    galaxyTravel.busy = Boolean(chat || entered);
  }, [chat, entered]);

  const showSky = gate === "galaxy" && !entered;
  const titleOn = showSky && born && !chat;

  return (
    <main className="relative h-dvh min-h-full w-full overflow-hidden bg-bg text-fg" style={{ background: "#0c0b0a" }}>
      {showSky && !sceneFailed && Scene && (
        <SceneErrorBoundary fallback={<FallbackSky />}>
          <Scene />
        </SceneErrorBoundary>
      )}
      {showSky && (sceneFailed || !Scene) && <FallbackSky />}

      {showSky && !chat && (
        <div className="vault-overlay pointer-events-none absolute inset-0 z-20 flex flex-col justify-between">
          <div className="galaxy-vignette pointer-events-none" />
          <header className="px-6 pt-[max(1.75rem,env(safe-area-inset-top))] text-center">
            {titleOn && !moved && (
              <h1 className="sign-soft font-display text-3xl tracking-tight text-fg italic md:text-5xl">
                <span className="word">what&apos;s</span>
                <span className="word">your</span>
                <span className="word">sign</span>
              </h1>
            )}
            {titleOn && moved && (
              <div key={sign.id} className="sign-swap">
                <p className="text-xs tracking-[0.28em] text-fg-muted uppercase">{sign.month}</p>
                <h2 className="mt-2 font-display text-4xl tracking-tight text-fg italic md:text-6xl">{sign.name}</h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-fg-muted md:text-base">{sign.essence}</p>
              </div>
            )}
          </header>
          <div className="galaxy-chrome pointer-events-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {moved && (
              <div className="mb-3 flex justify-center">
                <button
                  type="button"
                  className="rounded-full border border-border bg-bg-elevated/80 px-5 py-2 text-sm tracking-wide text-fg backdrop-blur-sm"
                  onClick={() => openBirthChat(currentConstellation().id)}
                >
                  This is my sign
                </button>
              </div>
            )}
            <SignStrip />
          </div>
        </div>
      )}

      {chat && !entered && <BirthChat />}

      {(chat || entered || gate === "library") && (
        <button
          type="button"
          className="absolute top-[max(0.85rem,env(safe-area-inset-top))] left-4 z-40 flex items-center gap-2 text-sm text-fg-muted"
          onClick={goBack}
        >
          <span aria-hidden className="inline-block h-3 w-3 rotate-45 border-t border-l border-accent" />
          Back
        </button>
      )}

      {gate === "library" && !entered && (
        <div className="vault-overlay absolute inset-0 z-30 flex flex-col justify-end bg-bg/80 px-6 pb-16 backdrop-blur-sm">
          <p className="text-xs tracking-[0.28em] text-fg-muted uppercase">The Vault</p>
          <h2 className="mt-2 font-display text-4xl italic">Library</h2>
          <ul className="mt-8 max-w-lg space-y-4">
            {LIBRARY.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-border bg-bg-elevated px-5 py-4 text-left"
                  onClick={() => openChart(item.id)}
                >
                  <span className="font-display text-xl italic">{item.title}</span>
                  <span className="mt-1 block text-sm text-fg-muted">{item.oneCut}</span>
                  <span className="mt-1 block text-xs tracking-wide text-fg-subtle">{item.date}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {entered && (
        <div className="vault-overlay absolute inset-0 z-20 flex items-end bg-gradient-to-t from-bg via-bg/70 to-transparent px-6 pb-16">
          <div>
            <p className="text-xs tracking-[0.28em] text-fg-muted uppercase">The Vault</p>
            <h2 className="mt-2 font-display text-4xl italic">Natal temple</h2>
            <p className="mt-3 max-w-md text-sm text-fg-muted">
              Sky, body, gates, machine, readings, bones, ask — recovered chart rooms live behind this door.
            </p>
            <button type="button" className="mt-6 text-sm text-fg-muted" onClick={openGalaxy}>
              Return to the sky
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
