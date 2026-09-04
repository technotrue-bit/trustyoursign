import type { SkyNatal } from "@/lib/chart/ephemeris";
import type { Nativity } from "@/lib/chart/schema";
import type { AppMode, ChartId, Selection, SignId } from "@/lib/chart/types";
import type { BirthFacts } from "./types";
import { useSessionStore, type SessionStore } from "./store";

export type BirthDate = BirthFacts;

export type ShelfSketch = {
  id: string;
  label: string;
  signId: SignId;
  birthMonth: number;
  birthDay: number;
  birthYear: number;
  birthHour: number | null;
  birthMinute: number | null;
  birthPlace: string | null;
  natal: SkyNatal | null;
  tone: "vault" | "warm";
  relation: "self" | "other";
  personName: string | null;
  from: "galaxy" | "library";
};

export type VaultState = {
  entered: boolean;
  gate: "galaxy" | "library";
  chartId: ChartId | null;
  research: Nativity | null;
  shelf: ShelfSketch | null;
  mode: AppMode;
  selection: Selection;
  hovered: Selection;
  chat: boolean;
  pickedSign: SignId | null;
  birth: BirthDate | null;
  tourBeat: string | null;
  sheetFolded: boolean;
  /** Big Three payload kept beside a visitor Nativity for Ask / deep-cut. */
  skyNatal: SkyNatal | null;
  openChart: (id: ChartId, research: Nativity) => void;
  openVisitor: (research: Nativity, sky: SkyNatal | null) => void;
  setChart: (id: ChartId) => void;
  openShelf: (sketch: Omit<ShelfSketch, "id"> & { id?: string }) => void;
  openLibrary: () => void;
  openGalaxy: () => void;
  library: () => void;
  openBirthChat: (sign: SignId) => void;
  closeBirthChat: () => void;
  setBirth: (birth: BirthDate) => void;
  setShelfNatal: (natal: SkyNatal) => void;
  setShelfTone: (tone: "vault" | "warm") => void;
  setMode: (mode: AppMode) => void;
  select: (selection: Selection) => void;
  hover: (hovered: Selection) => void;
  clear: () => void;
  goBack: () => void;
  nextTour: () => void;
  skipTour: () => void;
  foldSheet: (folded: boolean) => void;
};

type CompatActions = Pick<
  VaultState,
  | "openChart"
  | "openVisitor"
  | "setChart"
  | "openShelf"
  | "openLibrary"
  | "openGalaxy"
  | "library"
  | "openBirthChat"
  | "closeBirthChat"
  | "setBirth"
  | "setShelfNatal"
  | "setShelfTone"
  | "setMode"
  | "select"
  | "hover"
  | "clear"
  | "goBack"
  | "nextTour"
  | "skipTour"
  | "foldSheet"
>;

const compatActions: CompatActions = {
  openChart: (id, research) => {
    const store = useSessionStore.getState();
    if (id === "visitor") store.openLibraryVisitor(research);
    else store.openResearch(id, research);
  },
  openVisitor: (research, sky) => useSessionStore.getState().openVisitor(research, sky),
  setChart: (id) => useSessionStore.getState().setChart(id),
  openShelf: (sketch) =>
    useSessionStore.getState().openShelf({
      id: sketch.id,
      label: sketch.label,
      signId: sketch.signId,
      birth: {
        month: sketch.birthMonth,
        day: sketch.birthDay,
        year: sketch.birthYear,
        hour: sketch.birthHour,
        minute: sketch.birthMinute,
        place: sketch.birthPlace,
      },
      skyNatal: sketch.natal ?? null,
      tone: sketch.tone ?? "vault",
      relation: sketch.relation,
      personName: sketch.personName,
      origin: sketch.from,
      fromSavedId: sketch.from === "library" ? sketch.id : undefined,
    }),
  openLibrary: () => useSessionStore.getState().openLibrary(),
  openGalaxy: () => useSessionStore.getState().openGalaxy(),
  library: () => useSessionStore.getState().openLibrary(),
  openBirthChat: (sign) => useSessionStore.getState().openClaim(sign),
  closeBirthChat: () => useSessionStore.getState().closeClaim(),
  setBirth: (birth) => useSessionStore.getState().setClaimBirth(birth),
  setShelfNatal: (natal) => useSessionStore.getState().setShelfNatal(natal),
  setShelfTone: (tone) => useSessionStore.getState().setShelfTone(tone),
  setMode: (mode) => useSessionStore.getState().setMode(mode),
  select: (selection) => useSessionStore.getState().select(selection),
  hover: (hovered) => useSessionStore.getState().hover(hovered),
  clear: () => useSessionStore.getState().clear(),
  goBack: () => useSessionStore.getState().close(),
  nextTour: () => useSessionStore.getState().nextTour(),
  skipTour: () => useSessionStore.getState().skipTour(),
  foldSheet: (folded) => useSessionStore.getState().foldSheet(folded),
};

const projectionCache = new WeakMap<SessionStore, VaultState>();

function shelfSketch(state: SessionStore): ShelfSketch | null {
  const session = state.session;
  if (session?.kind !== "shelf") return null;
  return {
    id: session.id,
    label: session.label,
    signId: session.signId,
    birthMonth: session.birth.month,
    birthDay: session.birth.day,
    birthYear: session.birth.year,
    birthHour: session.birth.hour,
    birthMinute: session.birth.minute,
    birthPlace: session.birth.place,
    natal: session.skyNatal,
    tone: session.tone,
    relation: session.relation,
    personName: session.personName,
    from: session.origin,
  };
}

export function projectVaultState(state: SessionStore): VaultState {
  const cached = projectionCache.get(state);
  if (cached) return cached;
  const { session, claim, surface } = state;
  const chartId =
    session?.kind === "visitor"
      ? "visitor"
      : session?.kind === "research"
        ? (session.chartKey as ChartId)
        : null;
  const projected: VaultState = {
    entered: session !== null,
    gate: session?.origin ?? surface,
    chartId,
    research: session?.nativity ?? null,
    shelf: shelfSketch(state),
    mode: session?.mode ?? "sky",
    selection: session?.selection ?? null,
    hovered: session?.hovered ?? null,
    chat: claim !== null && session === null,
    pickedSign: claim?.signId ?? session?.signId ?? null,
    birth: claim?.birth ?? session?.birth ?? null,
    tourBeat: session?.tourBeat ?? null,
    sheetFolded: session?.sheetFolded ?? false,
    skyNatal: session?.skyNatal ?? null,
    ...compatActions,
  };
  projectionCache.set(state, projected);
  return projected;
}

export type VaultHook = {
  (): VaultState;
  <T>(selector: (state: VaultState) => T): T;
  getState: () => VaultState;
  getInitialState: () => VaultState;
  subscribe: (listener: (state: VaultState, previousState: VaultState) => void) => () => void;
};

function useVaultCompat<T = VaultState>(
  selector: (state: VaultState) => T = (state) => state as T,
): T {
  return useSessionStore((state) => selector(projectVaultState(state)));
}

export const useVault: VaultHook = Object.assign(useVaultCompat, {
  getState: () => projectVaultState(useSessionStore.getState()),
  getInitialState: () => projectVaultState(useSessionStore.getInitialState()),
  subscribe: (listener: (state: VaultState, previousState: VaultState) => void) =>
    useSessionStore.subscribe((state, previousState) => {
      listener(projectVaultState(state), projectVaultState(previousState));
    }),
});
