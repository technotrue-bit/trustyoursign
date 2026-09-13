import { assertSiteOwner } from "@/lib/owner.server";
import type { ResearchChartId } from "../types";
import type { Nativity } from "../schema";
import { SAIGE } from "./saige";
import { JOEY } from "./joey";

const RESEARCH: Record<ResearchChartId, Nativity> = { saige: SAIGE, joey: JOEY };

export function loadResearchNativity(id: ResearchChartId): Nativity {
  return RESEARCH[id];
}

export function listResearchLibrary() {
  return (Object.values(RESEARCH) as Nativity[]).map((n) => ({
    id: n.id,
    title: n.meta.name,
    oneCut: n.meta.oneCut,
    date: n.meta.date,
  }));
}

export const assertResearchOwner = assertSiteOwner;
