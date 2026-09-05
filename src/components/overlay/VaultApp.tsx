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
import { getResearchChart, listResearchLibrary } from "@/lib/chart/research";
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
import { isResearchChartId, type AppMode, type ChartId } from "@/lib/chart/types";
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
import { Gloss, GlossRoot, GlossStage } from "./Gloss";
import { StarBack } from "./StarBack";
import { AuthSlot } from "./AuthSlot";
import { GalaxyShell } from "./GalaxyShell";
import { ClaimShell } from "./ClaimShell";
import { TourGuide } from "./TourGuide";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { listCharts, type SavedChart } from "@/lib/charts";
import { computeVisitorNatal } from "@/lib/chart/sky";
import { SITE_OWNER, isSiteOwner } from "@/lib/owner";
import { Link } from "@tanstack/react-router";

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
      {!entered && gate === "library" ? <Intro /> : null}
      {entered ? <Chrome /> : null}
      {entered ? <TourGuide /> : null}
    </main>
  );
}

function Intro() {
  const user = useCurrentUser();
  const owner = isSiteOwner(user);
  const [desk, setDesk] = useState<
    { id: ChartId; title: string; oneCut: string; date: string }[] | null
  >(null);

  useEffect(() => {
    if (!owner) {
      setDesk(null);
      return;
    }
    listResearchLibrary()
      .then(setDesk)
      .catch(() => setDesk([]));
  }, [owner]);

  const openResearch = async (id: ChartId) => {
    if (!isResearchChartId(id)) return;
    const nat = await getResearchChart({ data: id });
    useSessionStore.getState().openResearch(id, nat);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-start md:items-center">
      <div className="absolute inset-0 bg-gradient-to-r from-bg from-25% via-bg/80 to-transparent" />
      <div className="stagger-in relative max-w-xl px-6 pt-16 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-12">
        <h1 className="font-display text-5xl leading-[1.05] font-medium tracking-tight text-fg italic md:text-6xl">
          The Vault
        </h1>
        <p className="mt-2 text-[0.7rem] tracking-[0.22em] text-fg-subtle uppercase">
          Kept by {SITE_OWNER.name} · {SITE_OWNER.handle}
        </p>
        <p className="mt-5 max-w-md text-base leading-relaxed text-fg-muted md:text-lg">
          <GlossRoot>
            <Gloss>
              {owner
                ? "Research desk. Timed charts stay here. Degrees first. Meaning second."
                : "A sun-sign shelf for the date you bring. The sky does not argue."}
            </Gloss>
          </GlossRoot>
        </p>
        {owner ? (
          <ul className="mt-8 space-y-3">
            {desk === null ? (
              <li className="h-16 animate-pulse rounded-md bg-bg-subtle" />
            ) : (
              desk.map((book) => (
                <li key={book.id}>
                  <button
                    type="button"
                    onClick={() => void openResearch(book.id)}
                    className="w-full rounded-md border border-border bg-bg-elevated/80 px-4 py-4 text-left transition-colors duration-150 hover:bg-bg-subtle"
                  >
                    <p className="font-display text-xl tracking-tight text-fg italic">
                      {book.title}
                    </p>
                    <p className="mt-1 text-sm text-fg-muted">{book.oneCut}</p>
                    <p className="mt-1 text-xs tracking-wide text-fg-subtle uppercase">
                      {book.id === "saige" ? "Premium house" : "Walkthrough"} · {book.date} ·
                      research
                    </p>
                  </button>
                </li>
              ))
            )}
            <li>
              <div className="rounded-md border border-dashed border-border px-4 py-4">
                <p className="font-display text-xl tracking-tight text-fg italic">The third</p>
                <p className="mt-1 text-sm text-fg-muted">
                  Sealed. When the house is finished, this is where it all comes together.
                </p>
                <p className="mt-1 text-xs tracking-wide text-fg-subtle uppercase">
                  Not yet · owner
                </p>
              </div>
            </li>
          </ul>
        ) : null}
        <SavedShelf />
      </div>
    </div>
  );
}

function SavedShelf() {
  const user = useCurrentUser();
  const [rows, setRows] = useState<SavedChart[] | null>(null);
  useEffect(() => {
    if (!user) {
      setRows(null);
      return;
    }
    listCharts()
      .then(setRows)
      .catch(() => setRows([]));
  }, [user]);
  if (!user) {
    return (
      <p className="mt-6 text-sm text-fg-muted">
        <Link to="/login" className="text-fg underline">
          Sign in
        </Link>{" "}
        to keep your chart, and other people’s, on this vault.
      </p>
    );
  }
  if (rows === null) return <div className="mt-6 h-12 animate-pulse rounded-md bg-bg-subtle" />;
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-fg-muted">
        No saved charts yet.{" "}
        <Link to="/account" className="text-fg underline">
          Open your account
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="mt-8">
      <p className="text-[0.7rem] tracking-[0.2em] text-fg-subtle uppercase">Saved</p>
      <ul className="mt-3 space-y-2">
        {rows.slice(0, 6).map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={async () => {
                if (c.natal && c.birthHour != null && c.birthMinute != null && c.birthPlace) {
                  try {
                    const { sky, nativity } = await computeVisitorNatal({
                      data: {
                        year: c.birthYear,
                        month: c.birthMonth,
                        day: c.birthDay,
                        hour: c.birthHour,
                        minute: c.birthMinute,
                        place: c.birthPlace,
                        tone: c.tone,
                        label: c.label,
                      },
                    });
                    useSessionStore.getState().openVisitor(nativity, sky);
                    return;
                  } catch {
                    /* fall through to shelf */
                  }
                }
                useSessionStore.getState().openShelf({
                  id: c.id,
                  label: c.label,
                  signId: c.signId,
                  birth: {
                    month: c.birthMonth,
                    day: c.birthDay,
                    year: c.birthYear,
                    hour: c.birthHour,
                    minute: c.birthMinute,
                    place: c.birthPlace,
                  },
                  skyNatal: c.natal,
                  tone: c.tone,
                  relation: c.relation,
                  personName: c.personName,
                  origin: "library",
                  fromSavedId: c.id,
                });
              }}
              className="w-full rounded-md border border-border px-4 py-3 text-left hover:bg-bg-subtle"
            >
              <p className="font-display text-lg text-fg italic">{c.label}</p>
              <p className="text-xs tracking-wide text-fg-subtle uppercase">
                {c.signId} · {c.birthMonth}/{c.birthDay}/{c.birthYear}
                {c.birthPlace ? ` · ${c.birthPlace}` : ""}
                {c.natal ? " · natal" : " · sun-sign shelf"}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <Link
        to="/account"
        className="mt-3 inline-flex min-h-11 items-center text-xs tracking-[0.18em] text-fg-muted uppercase"
      >
        All charts
      </Link>
    </div>
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
