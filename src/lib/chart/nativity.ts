import type { Nativity } from "./schema";
import { useVault } from "@/lib/store";

export type { Nativity, Meta, ExtraBone } from "./schema";
export type { ChartId } from "./types";

/** Loaded research nativity, or null if this session is not on an owner chart. */
export function useNativity(): Nativity | null {
  return useVault((s) => s.research);
}
