import type { Surface } from "@/lib/chart/session";

export type GateId = "galaxy" | "claim" | "library" | "natal";

export function resolveGate(input: {
  entered: boolean;
  claiming: boolean;
  surface: Surface;
}): GateId {
  if (input.entered) return "natal";
  if (input.claiming) return "claim";
  if (input.surface === "library") return "library";
  return "galaxy";
}
