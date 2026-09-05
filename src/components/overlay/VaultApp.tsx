import { useEffect, useState, type ComponentType } from "react";
import {
  BookOpen,
  Columns3,
  Compass,
  Hexagon,
  MessageCircle,
  PersonStanding,
  Table2,
} from "lucide-react";
import { useNativity } from "@/lib/chart/nativity";
import { getResearchChart } from "@/lib/chart/research";
import {
  useClaim,
  useSessionHovered,
  useSessionChartKey,
  useSessionKind,
  useSessionMode,
  useSessionOrigin,
  useSessionStore,
  useShelfSession,
  useSurface,
  useTourBeat,
  useIsEntered,
  roomsFor,
} from "@/lib/chart/session";
import { beatById } from "@/lib/chart/tour";
import { type AppMode, type ChartId } from "@/lib/chart/types";
import { CONSTELLATIONS } from "@/lib/galaxy/constellations";
import { useGalaxy } from "@/lib/galaxy/store";
import {
  ensureAutoClock,
  ensureFlyInput,
  galaxyTravel,
  skipBirth,
} from "@/lib/galaxy/travel";
import { bootIntro, skipIntro } from "@/lib/galaxy/intro";
import { buryWebGLCanvas, canWebGL, shouldUse3D } from "@/lib/gpu";
import { cn } from "@/lib/utils";
import { SceneErrorBoundary } from "../scene-error-boundary";
import { AskPanel } from "./AskPanel";
import { DetailPanel } from "./DetailPanel";
import { FallbackSky } from "./FallbackSky";
import { GalaxyShell } from "./GalaxyShell";
import { ClaimShell } from "./ClaimShell";
import { LibraryShell } from "./LibraryShell";
import { StarBack } from "./StarBack";
import { AuthSlot } from "./AuthSlot";
import { TourGuide } from "./TourGuide";

function chartRole(id: ChartId | null, date?: string) {
  if (id === "saige") return date ? `Premium house · ${date}` : "Premium house";
  if (id === "joey") return date ? `Walkthrough · ${date}` : "Walkthrough";
  if (id === "visitor") return date ? `Your natal · ${date}` : "Your natal";
  return date ?? "The Vault";
}

const MODES: { id: AppMode; label: string; icon: typeof Compass }[] = [
  { id: "sky", label: "Sky", icon: Compass },
  { id: "body", label: "Body", icon: PersonStanding },
  { id: "gates", label: "Gates", icon: Columns3 },
  { id: "machine", label: "Machine", icon: Hexagon },
  { id: "readings", label: "Readings", icon: BookOpen },
  { id: "bones", label: "Bones", icon: Table2 },
  { id: "ask", label: "Ask", icon: MessageCircle },
];

export function VaultApp() {
  const [Scene, setScene] = useState<ComponentType | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const claim = useClaim();
  const surface = useSurface();
  const entered = useIsEntered();
  const sessionKind = useSessionKind();
  const sessionOrigin = useSessionOrigin();
  const chat = claim !== null && !entered;
  const gate = sessionOrigin ?? surface;
  const shelf = sessionKind === "shelf";

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
      const st = useSessionStore.getState();
      if (e.key === "Escape") {
        if (st.session?.selection) st.clear();
        else st.close();
      }
      if (e.key === "Enter" && !st.session) {
        if (st.surface === "galaxy") {
          if (st.claim) return;
          if (galaxyTravel.birth < 1) {
            skipBirth();
            useGalaxy.getState().markBorn();
            return;
          }
          const g = useGalaxy.getState();
          if (g.moved) {
            const sign = CONSTELLATIONS[g.signIndex];
            if (sign) st.openClaim(sign.id);
          } else st.openLibrary();
        }
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 7) {
        const kind = st.session?.kind;
        if (!kind) return;
        const mode = roomsFor(kind)[n - 1];
        if (mode) st.setMode(mode.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    bootIntro();
    galaxyTravel.birth = 1;
    ensureAutoClock();
    ensureFlyInput();
  }, []);

  useEffect(() => {
    galaxyTravel.busy = Boolean(chat || entered);
  }, [chat, entered]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("desk");
    if (!q) return;
    const clean = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("desk");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    };
    if (q === "library") {
      skipIntro();
      skipBirth();
      useGalaxy.getState().markBorn();
      useSessionStore.getState().openLibrary();
      clean();
      return;
    }
    if (q === "saige" || q === "joey") {
      skipIntro();
      skipBirth();
      useGalaxy.getState().markBorn();
      void getResearchChart({ data: q })
        .then((nat) => {
          useSessionStore.getState().openResearch(q, nat);
          clean();
        })
        .catch(() => clean());
    }
  }, []);

  return (
    <main
      className="vault-stage relative overflow-hidden bg-bg text-fg"
      style={{ background: "#0c0b0a", color: "#efe8dc" }}
    >
      {Scene && !sceneFailed ? (
        <SceneErrorBoundary fallback={<FallbackSky />}>
          <Scene />
        </SceneErrorBoundary>
      ) : (
        <FallbackSky />
      )}
      {(entered && !shelf) || chat || gate === "library" ? <StarBack /> : null}
      {!entered && gate === "galaxy" && !chat ? <GalaxyShell /> : null}
      {!entered && gate === "galaxy" && chat ? <ClaimShell /> : null}
      {!entered && gate === "library" ? <LibraryShell /> : null}
      {entered ? <Chrome /> : null}
      {entered ? <TourGuide /> : null}
    </main>
  );
}


function Chrome() {
  const sessionKind = useSessionKind();
  const sessionChartKey = useSessionChartKey();
  const mode = useSessionMode();
  const setMode = useSessionStore((s) => s.setMode);
  const hovered = useSessionHovered();
  const shelf = useShelfSession();
  const chartKey =
    sessionKind === "visitor"
      ? "visitor"
      : sessionKind === "research"
        ? (sessionChartKey as ChartId)
        : null;
  const nat = useNativity();
  const roomDefs = sessionKind ? roomsFor(sessionKind) : [];
  const rooms = roomDefs.map((room) => MODES.find((mode) => mode.id === room.id)!);
  const title = shelf ? shelf.label : (nat?.meta.name ?? "The Vault");
  const who = shelf
    ? `${shelf.signId} · ${shelf.birth.month}/${shelf.birth.day}/${shelf.birth.year}`
    : chartRole(chartKey, nat?.meta.date);
  const tourBeat = useTourBeat();
  const tourRoom = beatById(tourBeat)?.mode;
  return (
    <>
      {mode !== "bones" ? (
        <header className="pointer-events-none absolute top-0 right-0 left-0 z-20 flex items-start justify-between gap-4 p-4 pt-[var(--chrome-top)] pl-[max(4.75rem,calc(var(--safe-left)+3.5rem))] md:p-6 md:pt-[max(1.25rem,var(--safe-top))] md:pl-32">
          <div>
            <p className="font-display text-xl tracking-tight text-fg italic">{title}</p>
            <p className="mt-0.5 text-xs tracking-[0.16em] text-fg-muted uppercase">{who}</p>
          </div>
          <p className="hidden max-w-56 text-right text-xs leading-relaxed text-fg-subtle md:block">
            {shelf ? (
              "Sun-sign shelf. Not a natal."
            ) : chartKey === "visitor" && nat ? (
              <>
                {nat.meta.zodiac} · {nat.meta.houses}
                <br />
                {nat.meta.engine}
                <br />
                {nat.meta.zone}
              </>
            ) : (
              <>
                {nat?.meta.date}
                <br />
                {nat?.meta.time}
                <br />
                {nat?.meta.place}
              </>
            )}
          </p>
          <AuthSlot />
        </header>
      ) : null}
      <DetailPanel />
      {mode === "ask" ? <AskPanel /> : null}
      {mode === "sky" && !hovered ? (
        <p className="pointer-events-none absolute bottom-24 left-4 z-20 hidden max-w-56 text-xs leading-relaxed text-fg-subtle md:block">
          Drag the sky. Click a planet or a sign.
        </p>
      ) : null}
      {hovered ? (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 hidden -translate-x-1/2 rounded-md bg-bg-elevated px-3 py-1.5 text-xs tracking-wide text-fg-muted md:block">
          {hovered.kind} · {hovered.id}
        </div>
      ) : null}
      <nav
        className="pointer-events-auto absolute right-0 bottom-0 left-0 z-30 flex w-full items-center justify-center pb-[var(--chrome-bottom)] md:bottom-5 md:left-1/2 md:w-auto md:-translate-x-1/2 md:pb-0"
        aria-label="Chart rooms"
      >
        <ul className="flex w-full items-stretch justify-between gap-0 border-t border-border bg-bg-elevated/95 px-1 py-1 md:w-auto md:gap-1 md:rounded-lg md:border md:px-1.5 md:py-1.5">
          {rooms.map((m) => {
            const Icon = m.icon;
            const on = mode === m.id;
            return (
              <li key={m.id} className="flex-1 md:flex-none">
                <button
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-md px-2 text-xs tracking-wide transition-colors duration-150 md:min-h-11 md:flex-row md:gap-2 md:px-3",
                    on ? "bg-bg-subtle text-fg" : "text-fg-muted hover:text-fg",
                    tourRoom && m.id === tourRoom ? "ring-1 ring-accent" : "",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{m.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
