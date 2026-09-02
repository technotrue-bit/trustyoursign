import type { ChakraId, PlanetId } from "./types";

export type ChakraDef = {
  id: ChakraId;
  name: string;
  sanskrit: string;
  y: number;
  color: string;
  glow: string;
  rulers: PlanetId[];
  headline: string;
  body: string[];
  practice: string;
};

export const CHAKRAS: ChakraDef[] = [
  {
    id: "root",
    name: "Root",
    sanskrit: "Muladhara",
    y: 0.28,
    color: "#c45c4a",
    glow: "#8a382c",
    rulers: ["node", "saturn", "chiron"],
    headline: "Enough. A house. A Tuesday that still exists.",
    body: [
      "The fate line ends here. North Node in Taurus in the 4th is not a slogan — it is the medicine. Body, food, land, a private life that is actually private, the nervous system coming down.",
      "Saturn in Cancer (the only cardinal planet) says belonging has a price and a structure. Chiron in intercepted Capricorn says she may think the wound is “too much” when the deeper wound is I must already be solid.",
      "This chart has more intensity than the room. The root is not more intensity. The root is slow worth. Boring in the holy way.",
    ],
    practice: "Build the thing that still exists on an ordinary Tuesday. Schedule the body the way Mercury schedules the truth.",
  },
  {
    id: "sacral",
    name: "Sacral",
    sanskrit: "Svadhisthana",
    y: 0.62,
    color: "#d08958",
    glow: "#a06038",
    rulers: ["moon", "venus", "lilith"],
    headline: "The feeling-body does not do halfway.",
    body: [
      "Moon in Scorpio in fall: ordinary lunar functions — soothe, nest, be held — are a foreign country. Safety is truth that cannot be taken. Devotion, jealousy, silence, the rotting board under a pretty floor.",
      "Venus in Gemini wants the conversation that is already a kiss. Pluto opposes that Venus. The sacral is where the engine and the underworld share a bed.",
      "Lilith on the descendant: a feral current in desire that will not be made nice. If a bond cannot hold the real temperature, this center will not pretend.",
    ],
    practice: "Do not override a true no for a year. The Moon in fall will not be talked out of it. Let desire be both witty and total, or let it leave.",
  },
  {
    id: "solar",
    name: "Solar plexus",
    sanskrit: "Manipura",
    y: 0.98,
    color: "#d4b46a",
    glow: "#a88840",
    rulers: ["sun", "mars"],
    headline: "The will is royal. It lives in the vault.",
    body: [
      "Sun in Leo in the 8th, in domicile: she will not be owned. Pride is not vanity — it is the self that remains after fusion, money, secrets, desire, death have done their work.",
      "Mars in Leo in the 8th: royal anger, heat in the private, a clean cut when silence has failed. Trine Pluto — will that works in the dark.",
      "The 8th-house cluster (Sun, Mercury, Mars, Vertex) is the locked room. This chakra is not a stage light. It is the furnace behind the door.",
    ],
    practice: "When she feels fake, the Leo Sun is being asked to perform 10th-house Scorpio. Go back to the vault. The real Sun is the self that remains after the fusion.",
  },
  {
    id: "heart",
    name: "Heart",
    sanskrit: "Anahata",
    y: 1.36,
    color: "#7a9a7e",
    glow: "#4e7054",
    rulers: ["venus", "saturn"],
    headline: "The house and the pulse. Both. Not one.",
    body: [
      "Venus is the engine of the locomotive. Life moves through relating, voice, attraction, the other person. She meets herself in partners.",
      "Saturn in the 7th says the real marriage — legal or not — is a grown-up thing: caretaking, time, the unglamorous weather of two nervous systems.",
      "If she only chases Pluto and never lets Saturn in, she gets intensity without a house. If she only lets Saturn in and starves Pluto, she gets a house without a pulse. The chart wants both.",
    ],
    practice: "Choose the person who can stay interesting and not flinch when the vault opens. Lilith’s rule: not the one who is ashamed of her intensity. The one who is oriented by it.",
  },
  {
    id: "throat",
    name: "Throat",
    sanskrit: "Vishuddha",
    y: 1.74,
    color: "#6a8aaa",
    glow: "#3e6280",
    rulers: ["mercury", "venus"],
    headline: "The mind is not the wound. The mind is the medicine.",
    body: [
      "Mercury in Virgo, domicile and exaltation, in the 8th. The blade that autopsies. Part of Spirit sits on this Mercury — the daimon, the thing the soul is trying to do.",
      "Venus in Gemini: she falls in love with a mind. Part of Fortune in Aries in the 3rd: body-luck through voice, motion, siblings.",
      "Moon square Mercury: the stutter between heart and mouth. That stutter is why writing, naming, diagnosing, and dark humor heal her. If she cannot explain a decision in clean sentences, it is not ready.",
    ],
    practice: "Let Virgo-Mercury sign. Impulse and feeling will try to skip the audit. The exalted mind is the adult in the room.",
  },
  {
    id: "brow",
    name: "Third eye",
    sanskrit: "Ajna",
    y: 2.08,
    color: "#6a6e9a",
    glow: "#3e4270",
    rulers: ["mercury", "uranus", "pluto"],
    headline: "Sudden knowing. The room changes before she has a name.",
    body: [
      "Mercury opposite Uranus, plus a 0.09° contraparallel — the sky said it twice. Lightning mind. Sleep on it and the answer arrives as a jolt, not a committee.",
      "Pluto in the 12th conjunct the rising: people feel her before they have a name for her. Animals know. Children know. Liars know. The underworld is behind the curtain of the self.",
      "This is not intuition as a brand. It is the 12th house, correctly sized. Things that look out of proportion to outsiders are not out of proportion to the invisible.",
    ],
    practice: "When she feels too much: that is Pluto on the rising plus Moon in fall. It is not a personality error. Give the weather a house. Do not become less.",
  },
  {
    id: "crown",
    name: "Crown",
    sanskrit: "Sahasrara",
    y: 2.38,
    color: "#cfc6d4",
    glow: "#8a8090",
    rulers: ["jupiter", "neptune"],
    headline: "Faith that has to be earned with the hands.",
    body: [
      "Jupiter, the chart ruler, sits in Virgo in the 9th in detriment. The life-path is not lucky wanderer. It is the craft of meaning: study, skill, apprenticeship.",
      "Jupiter wants God and the big yes. Virgo says prove it. So blessing arrives as a skill, a diagnosis, a humble useful thing — not as a lottery ticket.",
      "Neptune in the 2nd: a foggy current in worth, a nose for what a group is dreaming. The danger is preaching past the wound (Jupiter square Pluto). Let Virgo-Jupiter be a craft, not a sermon.",
    ],
    practice: "Do not dress a wound as a philosophy. Make the huge idea actually work. That is the sacred.",
  },
];

export const CHAKRA_BY_ID: Record<ChakraId, ChakraDef> = CHAKRAS.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<ChakraId, ChakraDef>,
);
