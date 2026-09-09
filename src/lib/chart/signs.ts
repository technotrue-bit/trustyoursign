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

/** Saige essay layer — identity fields come from SIGN_CANON. */
const ESSAY: Record<
  SignId,
  Pick<SignDef, "intercepted" | "headline" | "body" | "inChart">
> = {
  aries: {
    intercepted: false,
    headline: "The private strike.",
    body: "Aries on the IC is heat at the root — not a public war. Beginnings live in the basement of the chart, in the house, the body, the origin story.",
    inChart:
      "IC at 19° Aries. Part of Fortune at 17° Aries in the 3rd. The luck of the body is a voice that moves, a sibling-bond, a first step taken without a committee.",
  },
  taurus: {
    intercepted: false,
    headline: "The prescription.",
    body: "Taurus is enoughness: food, land, a nervous system that is allowed to come down. Slow worth. A private life that is actually private.",
    inChart:
      "North Node at 7° Taurus in the 4th. The whole chart loves Scorpio; the Node says do not make a career out of the underworld just because you are good at it. Go home.",
  },
  gemini: {
    intercepted: false,
    headline: "The engine’s mouth.",
    body: "Gemini is wit, twins, the conversation that is already a kiss. Duplicated here (houses 6 and 7): work and the Other share a language.",
    inChart:
      "Venus at 20° Gemini, pressed to the descendant — the engine of the whole locomotive. Mean Lilith at 29° Gemini. The type is quick and clever, then total.",
  },
  cancer: {
    intercepted: true,
    headline: "Locked inside relationship.",
    body: "Intercepted: Cancer has no house door. Need, mother, belonging live inside the body of partnership. Other people cannot see this weather until it breaks.",
    inChart:
      "Saturn at 19° Cancer in the 7th, in detriment, exact square to the midheaven. The only cardinal planet in the set. Beginning, for her, is a vow — not a whim.",
  },
  leo: {
    intercepted: false,
    headline: "The vault, not the stage.",
    body: "Leo wants to be the authentic center. In this chart the center is a locked room. Pride is the refusal to be made small by other people’s money, secrets, desire, or death.",
    inChart:
      "Sun at 4° Leo in the 8th, in domicile. Mars at 20° Leo. Vertex at 6° Leo. Fated people arrive through fusion, inheritance, the friend who becomes a soul-event.",
  },
  virgo: {
    intercepted: false,
    headline: "The blade that loves small truths.",
    body: "Virgo is discrimination, craft, the sacred ordinary. Here it holds both the strongest planet and the chart ruler in exile. Faith has to be earned with the hands.",
    inChart:
      "Mercury at 1° Virgo — domicile and exaltation — in the 8th. Jupiter at 17° Virgo in the 9th, detriment, the life-ruler. Part of Spirit sits on Mercury.",
  },
  libra: {
    intercepted: false,
    headline: "The public in-between.",
    body: "Libra at the midheaven wants harmony, counsel, design, the art of sitting between two sides. Then Saturn squares it to the minute.",
    inChart:
      "MC at 19° Libra. Venus trines it; Mars sextiles it; Saturn squares it exact. She can charm the room, and then the room asks her to grow up.",
  },
  scorpio: {
    intercepted: false,
    headline: "All or nothing. Never halfway.",
    body: "Scorpio does not soothe in the factory setting. Safety is not softness. Safety is truth that cannot be taken. Devotion will be the first language; comfort will not.",
    inChart:
      "Moon at 27° Scorpio in the 11th, in fall. South Node at 7° Scorpio in the 10th. The feeling-nature plays out through friends, allies, the future, the scene.",
  },
  sagittarius: {
    intercepted: false,
    headline: "Fire at the door.",
    body: "The face the world gets: heat, horizon, honesty, a future-tense walk. People meet the archer first. They do not meet the vault. Duplicated (houses 12 and 1).",
    inChart:
      "Ascendant 24° Sagittarius. Pluto at 19° Sagittarius in the 12th, 4°43′ behind the rising. The room changes before anyone has a name for her.",
  },
  capricorn: {
    intercepted: true,
    headline: "Locked inside the self.",
    body: "Intercepted: Capricorn has no house door. Authority, father, competence, time live inside the body of identity. She may not even name this as the wound.",
    inChart:
      "Chiron retrograde at 22° Capricorn in the intercepted 1st. Juno retrograde in the same room. I must already be solid — and I am supposed to already be the adult.",
  },
  aquarius: {
    intercepted: false,
    headline: "The future’s atmosphere.",
    body: "Aquarius on the 2nd-house door: worth that belongs to a collective as much as to a wallet. The danger is leaking value. The gift is a nose for what a group is dreaming.",
    inChart:
      "2nd cusp at 2° Aquarius. Neptune at 14° Aquarius, retrograde, in the 2nd. Idealism about what she owes. Undercharging, overgiving, getting paid in vibes — or naming the weather first.",
  },
  pisces: {
    intercepted: false,
    headline: "The floor that rewrites itself.",
    body: "Pisces dissolves the orthodox. In the 2nd/3rd it is money, values, and the mind’s weather that will not stay put. Revolution happens inside first.",
    inChart:
      "Uranus at 6° Pisces retrograde in the 2nd, opposite Mercury. Vesta at 28° Pisces in the 3rd. Sudden knowing. Cannot be forced into a stupid consensus.",
  },
};

export const SIGNS: SignDef[] = SIGN_IDS.map((id) => {
  const c = SIGN_CANON[id];
  const e = ESSAY[id];
  return {
    id: c.id,
    name: c.name,
    abbr: c.abbr,
    startLon: c.startLon,
    element: c.element,
    modality: c.modality,
    intercepted: e.intercepted,
    headline: e.headline,
    body: e.body,
    inChart: e.inChart,
  };
});

export function signAtLon(lon: number): SignDef {
  const i = Math.floor((((lon % 360) + 360) % 360) / 30);
  return SIGNS[i] ?? SIGNS[0];
}
