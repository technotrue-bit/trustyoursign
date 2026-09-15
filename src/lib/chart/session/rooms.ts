import type { AppMode } from "@/lib/chart/types";
import type { SessionKind } from "./types";

export type RoomDef = {
  id: AppMode;
  label: string;
};

/** Full dock order — icons stay in VaultApp, keyed by id. */
export const ROOM_CATALOG: readonly RoomDef[] = [
  { id: "sky", label: "Sky" },
  { id: "body", label: "Body" },
  { id: "gates", label: "Gates" },
  { id: "machine", label: "Machine" },
  { id: "readings", label: "Readings" },
  { id: "bones", label: "Bones" },
  { id: "ask", label: "Ask" },
] as const;

const ALLOWED: Record<SessionKind, readonly AppMode[]> = {
  research: ROOM_CATALOG.map((r) => r.id),
  visitor: ["sky", "body", "gates", "machine", "readings", "bones", "ask"],
  shelf: ["sky", "ask"],
};

export function roomsFor(kind: SessionKind): RoomDef[] {
  const allow = new Set(ALLOWED[kind]);
  return ROOM_CATALOG.filter((r) => allow.has(r.id));
}

export function canEnter(kind: SessionKind, mode: AppMode): boolean {
  return ALLOWED[kind].includes(mode);
}
