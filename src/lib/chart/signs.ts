import type { Element, Modality, SignId } from "./types";

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

export const SIGNS: SignDef[] = [
  {
    id: "aries",
    name: "Aries",
    abbr: "Ari",
    startLon: 0,
    element: "fire",
    modality: "cardinal",
    intercepted: false,
    headline: "The private strike.",
    body: "Aries on the IC is heat at the root — not a public war. Beginnings live in the basement of the chart, in the house, the body, the origin story.",
    inChart:
      "IC at 19° Aries. Part of Fortune at 17° Aries in the 3rd. The luck of the body is a voice that moves, a sibling-bond, a first step taken without a committee.",
  },
  {
    id: "taurus",
    name: "Taurus",
    abbr: "Tau",
    startLon: 30,
    element: "earth",
    modality: "fixed",
    intercepted: false,
    headline: "The prescription.",
    body: "Taurus is enoughness: food, land, a nervous system that is allowed to come down. Slow worth. A private life that is actually private.",
    inChart:
      "North Node at 7° Taurus in the 4th. The whole chart loves Scorpio; the Node says do not make a career out of the underworld just because you are good at it. Go home.",
  },
  {
    id: "gemini",
    name: "Gemini",
    abbr: "Gem",
    startLon: 60,
    element: "air",
    modality: "mutable",
    intercepted: false,
    headline: "The engine’s mouth.",
    body: "Gemini is wit, twins, the conversation that is already a kiss. Duplicated here (houses 6 and 7): work and the Other share a language.",
    inChart:
      "Venus at 20° Gemini, pressed to the descendant — the engine of the whole locomotive. Mean Lilith at 29° Gemini. The type is quick and clever, then total.",
  },
  {
    id: "cancer",
    name: "Cancer",
    abbr: "Can",
    startLon: 90,
    element: "water",
    modality: "cardinal",
    intercepted: true,
    headline: "Locked inside relationship.",
    body: "Intercepted: Cancer has no house door. Need, mother, belonging live inside the body of partnership. Other people cannot see this weather until it breaks.",
    inChart:
      "Saturn at 19° Cancer in the 7th, in detriment, exact square to the midheaven. The only cardinal planet in the set. Beginning, for her, is a vow — not a whim.",
  },
  {
    id: "leo",
    name: "Leo",
    abbr: "Leo",
    startLon: 120,
    element: "fire",
    modality: "fixed",
    intercepted: false,
    headline: "The vault, not the stage.",
    body: "Leo wants to be the authentic center. In this chart the center is a locked room. Pride is the refusal to be made small by other people’s money, secrets, desire, or death.",
    inChart:
      "Sun at 4° Leo in the 8th, in domicile. Mars at 20° Leo. Vertex at 6° Leo. Fated people arrive through fusion, inheritance, the friend who becomes a soul-event.",
  },
  {
    id: "virgo",
    name: "Virgo",
    abbr: "Vir",
    startLon: 150,
    element: "earth",
    modality: "mutable",
    intercepted: false,
    headline: "The blade that loves small truths.",
    body: "Virgo is discrimination, craft, the sacred ordinary. Here it holds both the strongest planet and the chart ruler in exile. Faith has to be earned with the hands.",
    inChart:
      "Mercury at 1° Virgo — domicile and exaltation — in the 8th. Jupiter at 17° Virgo in the 9th, detriment, the life-ruler. Part of Spirit sits on Mercury.",
  },
  {
    id: "libra",
    name: "Libra",
    abbr: "Lib",
    startLon: 180,
    element: "air",
    modality: "cardinal",
    intercepted: false,
    headline: "The public in-between.",
    body: "Libra at the midheaven wants harmony, counsel, design, the art of sitting between two sides. Then Saturn squares it to the minute.",
    inChart:
      "MC at 19° Libra. Venus trines it; Mars sextiles it; Saturn squares it exact. She can charm the room, and then the room asks her to grow up.",
  },
  {
    id: "scorpio",
    name: "Scorpio",
    abbr: "Sc
... 