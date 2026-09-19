import type { Element, Modality, SignId } from "./types";
import { SIGN_CANON, SIGN_IDS } from "./sign-canon";

export type SignDef = {
  id: SignId;
  name: string;
  abbr: string;
  startLon: number;
  element: Element;
  modality: Modality;
  intercepted: boolean;
  headline: string;
  body: string;
  inChart: string;
};

/**
 * Public climate layer only — no natal degrees, houses, or personal “in this chart”
 * copy. Research books (Saige / Joey) overlay their own essays server-side.
 */
const CLIMATE: Record<SignId, Pick<SignDef, "headline" | "body">> = {
  aries: {
    headline: "The private strike.",
    body: "Aries is heat at the root — beginnings in the body and the origin story, not a public war.",
  },
  taurus: {
    headline: "The prescription.",
    body: "Taurus is enoughness: food, land, a nervous system that is allowed to come down. Slow worth.",
  },
  gemini: {
    headline: "The engine’s mouth.",
    body: "Gemini is wit, twins, the conversation that is already a kiss. Work and the Other can share a language.",
  },
  cancer: {
    headline: "Belonging weather.",
    body: "Cancer is need, mother, belonging — the tide under partnership and home.",
  },
  leo: {
    headline: "The vault, not the stage.",
    body: "Leo wants to be the authentic center. Pride is the refusal to be made small.",
  },
  virgo: {
    headline: "The blade that loves small truths.",
    body: "Virgo is discrimination, craft, the sacred ordinary. Faith earned with the hands.",
  },
  libra: {
    headline: "The public in-between.",
    body: "Libra wants harmony, counsel, design — the art of sitting between two sides.",
  },
  scorpio: {
    headline: "All or nothing. Never halfway.",
    body: "Scorpio does not soothe in the factory setting. Safety is truth that cannot be taken.",
  },
  sagittarius: {
    headline: "Fire at the door.",
    body: "The face the world gets: heat, horizon, honesty, a future-tense walk.",
  },
  capricorn: {
    headline: "Authority in the bone.",
    body: "Capricorn is competence, time, the adult floor — structure that outlasts a mood.",
  },
  aquarius: {
    headline: "The future’s atmosphere.",
    body: "Aquarius is worth that belongs to a collective as much as to a wallet — a nose for what a group is dreaming.",
  },
  pisces: {
    headline: "The floor that rewrites itself.",
    body: "Pisces dissolves the orthodox. Revolution happens inside first.",
  },
};

export const SIGNS: SignDef[] = SIGN_IDS.map((id) => {
  const c = SIGN_CANON[id];
  const e = CLIMATE[id];
  return {
    id: c.id,
    name: c.name,
    abbr: c.abbr,
    startLon: c.startLon,
    element: c.element,
    modality: c.modality,
    intercepted: false,
    headline: e.headline,
    body: e.body,
    inChart: "",
  };
});

export function signAtLon(lon: number): SignDef {
  const i = Math.floor((((lon % 360) + 360) % 360) / 30);
  return SIGNS[i] ?? SIGNS[0];
}
