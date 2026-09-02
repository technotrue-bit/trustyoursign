import type { ChartId } from "./types";
import { useVault } from "@/lib/store";

export type ChartIdExport = ChartId;

export const LIBRARY: { id: ChartId; title: string; oneCut: string; date: string }[] = [
  {
    id: "saige",
    title: "Saige K",
    oneCut: "A fire face, a vault heart, a surgical mind.",
    date: "Monday, 26 July 2004",
  },
  {
    id: "joey",
    title: "Joey Devin Norris",
    oneCut: "Gemini rising, a Sagittarius sun in the 7th, an Aquarius moon.",
    date: "Monday, 13 December 1999",
  },
];

export function useNativity() {
  const id = useVault((s) => s.chartId) ?? "saige";
  return LIBRARY.find((c) => c.id === id) ?? LIBRARY[0]!;
}
