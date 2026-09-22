import { ASPECTS } from "./saige-aspects";
import { CHAKRA_BY_ID, CHAKRAS } from "./saige-chakras";
import {
  DECISION_CLOSE,
  DECISION_STEPS,
  GATE_BY_ID,
  GATES,
  READING_BY_ID,
  READINGS,
} from "./saige-copy";
import type { Angles } from "../geometry";
import type { Nativity } from "../schema";
import { SIGNS, type SignDef } from "../signs";
import type { SignId } from "../types";
import { ELEMENTS, HOUSE_CUSPS, META, MODALITIES } from "./saige-houses";
import { PLANET_BY_ID, PLANETS } from "./saige-planets";

/** Saige K — Placidus. Kept with the research book, not in the public geometry module. */
const SAIGE_ANGLES: Angles = {
  asc: 24 + 33 / 60 + 57 / 3600 + 240,
  ic: 19 + 15 / 60 + 12 / 3600,
  dsc: 24 + 33 / 60 + 57 / 3600 + 60,
  mc: 19 + 15 / 60 + 12 / 3600 + 180,
};

/** Natal essay overlay — never ship this through the public `signs` climate module. */
const SAIGE_SIGNS: Record<
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

const signs: SignDef[] = SIGNS.map((s) => {
  const essay = SAIGE_SIGNS[s.id];
  return {
    ...s,
    intercepted: essay.intercepted,
    headline: essay.headline,
    body: essay.body,
    inChart: essay.inChart,
  };
});

export const SAIGE: Nativity = {
  id: "saige",
  person: "she",
  meta: META,
  angles: SAIGE_ANGLES,
  planets: PLANETS,
  planetById: PLANET_BY_ID,
  houses: HOUSE_CUSPS,
  elements: ELEMENTS,
  modalities: MODALITIES,
  signs,
  aspects: ASPECTS,
  chakras: CHAKRAS,
  chakraById: CHAKRA_BY_ID,
  gates: GATES,
  gateById: GATE_BY_ID,
  steps: DECISION_STEPS,
  decisionClose: DECISION_CLOSE,
  readings: READINGS,
  readingById: READING_BY_ID,
  suggested: [
    "Was Venus driving?",
    "Did the 8th house vote?",
    "Did Mercury sign?",
    "Did the Scorpio Moon get a veto?",
    "Did Saturn in the 7th get a structure?",
    "Is this south-node proving, or north-node housing?",
    "Why does she feel too much?",
    "What is the wound under “I’m too much”?",
    "How does she choose in love?",
    "What work does this chart actually want?",
  ],
  alwaysLabel: ["sun", "moon", "venus", "pluto", "asc"],
  extraBones: [],
  canonExtra: "",
  machineTitle: "How she decides.",
  readingsTitle: "Love, work, body, clothes, wound, becoming.",
};
