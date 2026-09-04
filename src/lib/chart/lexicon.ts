export type LexEntry = {
  id: string;
  word: string;
  aliases: string[];
  info: string;
  meaning: string;
  truth: string;
};

/** Words people pause on. Information, then meaning, then the thing itself. */
export const LEXICON: LexEntry[] = [
  {
    id: "planet",
    word: "Planet",
    aliases: ["planets", "planet"],
    info: "A moving point in the sky, named for a function of life: will, feeling, mind, bond, drive, faith, time, shock, dream, power.",
    meaning: "Not a character. A job the life keeps doing. The Sun is not “you.” It is the will. The Moon is not “mood.” It is the body that feels.",
    truth: "A planet is a verb wearing a name.",
  },
  {
    id: "degree",
    word: "Degree",
    aliases: ["degrees", "degree"],
    info: "One three-hundred-and-sixtieth of the zodiac circle. Written as 4° Leo 14′ — sign, then the slice inside the sign.",
    meaning: "Degrees are the bones. Sign is the room. House is the life it happens in. Without the degree, the rest is atmosphere.",
    truth: "The sky does not argue. The minute is the argument.",
  },
  {
    id: "house",
    word: "House",
    aliases: ["houses", "house"],
    info: "One of twelve rooms of a life, counted from the rising sign. First is the body at the door. Tenth is the public roof. Fourth is the floor you sleep on.",
    meaning: "The sign says how. The house says where it lands: love, work, money, the hidden, the stage.",
    truth: "A planet without a house is a feeling with no address.",
  },
  {
    id: "sign",
    word: "Sign",
    aliases: ["signs", "sign"],
    info: "A thirty-degree span of the tropical zodiac. Aries through Pisces. Element and modality live here.",
    meaning: "Costume and climate — fire or earth, cardinal or fixed — not a personality slogan.",
    truth: "The sign is the weather. You still have to walk in it.",
  },
  {
    id: "aspect",
    word: "Aspect",
    aliases: ["aspects", "aspect"],
    info: "An angle between two points. Conjunction, sextile, square, trine, opposition, and the rarer ones. Measured in degrees of orb.",
    meaning: "A wire. Two functions in the same life that cannot pretend they have not met.",
    truth: "An aspect is a conversation that does not end.",
  },
  {
    id: "orb",
    word: "Orb",
    aliases: ["orbs", "orb"],
    info: "How many degrees an aspect is from exact. 0° is iron. 6° is a wide, living thing.",
    meaning: "Tight orbs run the life whether you notice or not. Wide orbs are weather you can work with.",
    truth: "Exact is a blade. Wide is a climate.",
  },
  {
    id: "retrograde",
    word: "Retrograde",
    aliases: ["retrogrades", "retrograde", "rx"],
    info: "Apparent backward motion. The point is revisiting sky it already passed. Written Rx.",
    meaning: "The function turns inward, repeats, renegotiates. It is not broken. It is not doing it for the room.",
    truth: "Retrograde is a second draft the sky insisted on.",
  },
  {
    id: "dignity",
    word: "Dignity",
    aliases: ["dignities", "dignity"],
    info: "Whether a planet is in a sign it rules (domicile), is exalted, in detriment, in fall, or wandering (peregrine).",
    meaning: "How much home-field the function has. Dignity is training, not a grade.",
    truth: "Detriment and fall are how the power is taught — not a verdict.",
  },
  {
    id: "domicile",
    word: "Domicile",
    aliases: ["domicile"],
    info: "A planet in the sign it rules. Sun in Leo. Moon in Cancer. Mars in Aries or Scorpio.",
    meaning: "The function speaks its first language. It does not have to translate itself to exist.",
    truth: "Domicile is a locked room that belongs to you.",
  },
  {
    id: "exaltation",
    word: "Exaltation",
    aliases: ["exaltations", "exaltation", "exalted"],
    info: "A sign where the planet is honoured, not owner. Mercury exalted in Virgo. Moon exalted in Taurus.",
    meaning: "The function is good at this climate — sometimes too good. It can become the adult in the room.",
    truth: "Exaltation is a gift with a job.",
  },
  {
    id: "detriment",
    word: "Detriment",
    aliases: ["detriments", "detriment"],
    info: "A planet in the sign opposite its home. Jupiter in Virgo. Saturn in Cancer or Leo. Venus in Aries or Scorpio.",
    meaning: "The function works in a foreign factory. It still works. It spends more to do the same thing.",
    truth: "Detriment is not weakness. It is overtime.",
  },
  {
    id: "fall",
    word: "Fall",
    aliases: ["fall"],
    info: "A planet in the sign opposite its exaltation. Moon in Scorpio. Sun in Libra. Mars in Cancer.",
    meaning: "The ordinary comfort of that function does not ship from the factory. It has to be learned as a second country.",
    truth: "Fall does not mean bad. It means the first language was never comfort.",
  },
  {
    id: "peregrine",
    word: "Peregrine",
    aliases: ["peregrine"],
    info: "A planet in a sign where it has no domicile, exaltation, detriment, or fall.",
    meaning: "No home-field, no exile. It improvises. It is free and it is unshielded.",
    truth: "Peregrine is a guest who still has to pay rent.",
  },
  {
    id: "intercepted",
    word: "Intercepted",
    aliases: ["intercepted", "interception"],
    info: "A sign swallowed whole inside a house, with no cusp of its own. The opposite sign is intercepted too.",
    meaning: "That climate has no front door. It leaks through the houses on either side, or it waits in the walls.",
    truth: "Intercepted is a room with no handle. You still live there.",
  },
  {
    id: "rising",
    word: "Rising",
    aliases: ["ascendant", "rising", "asc"],
    info: "The sign and degree on the eastern horizon at the minute of birth. First house cusp. The face the world gets.",
    meaning: "Not a mask you chose. The body at the door — how life arrives, how you are met before anyone knows you.",
    truth: "People meet the rising first. They do not meet the vault.",
  },
  {
    id: "descendant",
    word: "Descendant",
    aliases: ["descendant", "dsc"],
    info: "The western horizon. Seventh house cusp. Opposite the rising.",
    meaning: "The Other. Partnership, the open enemy, the person who sits in the other chair.",
    truth: "The descendant is the mirror you marry, fight, or become.",
  },
  {
    id: "midheaven",
    word: "Midheaven",
    aliases: ["midheaven", "mc"],
    info: "The highest sky at birth. Tenth house cusp. The public roof.",
    meaning: "Work, reputation, the story the world tells about you — earned, not announced.",
    truth: "The midheaven is what they put on the door. The Sun is what you are when the door shuts.",
  },
  {
    id: "ic",
    word: "IC",
    aliases: ["imum coeli", "ic"],
    info: "The lowest sky. Fourth house cusp. Opposite the midheaven.",
    meaning: "The floor: home, the private weather, what you come back to when the performance ends.",
    truth: "The IC is the house you actually sleep in.",
  },
  {
    id: "vertex",
    word: "Vertex",
    aliases: ["vertex"],
    info: "A fated point in the West, often near the descendant. Not a planet. A doorway.",
    meaning: "People and events that arrive as if they were already written. Fusion, not a casual knock.",
    truth: "The vertex does not date lightly, even when you tell yourself you are dating lightly.",
  },
  {
    id: "conjunction",
    word: "Conjunction",
    aliases: ["conjunctions", "conjunction"],
    info: "0°. Two points in the same place, or close enough that the sky treats them as one.",
    meaning: "Fusion. The two functions share a body. They cannot take turns without taking each other.",
    truth: "A conjunction is one animal with two names.",
  },
  {
    id: "sextile",
    word: "Sextile",
    aliases: ["sextiles", "sextile"],
    info: "60°. An easy angle. Opportunity, not a guarantee.",
    meaning: "The two functions can work. They will not drag you. You still have to pick up the tool.",
    truth: "A sextile is a door that does not open itself.",
  },
  {
    id: "square",
    word: "Square",
    aliases: ["squares", "square"],
    info: "90°. A hard right angle. Friction you can use.",
    meaning: "Two jobs that interrupt each other until they become a craft. This is how a life gets a spine.",
    truth: "A square is the exam. Passing it is the gift.",
  },
  {
    id: "trine",
    word: "Trine",
    aliases: ["trines", "trine"],
    info: "120°. The easy flow of the same element.",
    meaning: "Talent, grace, a current that runs whether you steer or not. Can go lazy. Can go holy.",
    truth: "A trine is a gift you can waste.",
  },
  {
    id: "opposition",
    word: "Opposition",
    aliases: ["oppositions", "opposition"],
    info: "180°. Face to face across the wheel.",
    meaning: "The other chair. Projection, partnership, the thing you meet outside and then have to own.",
    truth: "What you oppose, you marry.",
  },
  {
    id: "quincunx",
    word: "Quincunx",
    aliases: ["quincunxes", "quincunx"],
    info: "150°. No shared element, no shared modality. An awkward adjust.",
    meaning: "The two functions cannot see in the same units. They keep missing, then compensating.",
    truth: "A quincunx is a lifelong translation.",
  },
  {
    id: "sesquare",
    word: "Sesquiquadrate",
    aliases: ["sesquiquadrate", "sesquare"],
    info: "135°. A tense off-square. Irritation that does not resolve into a clean fight.",
    meaning: "Pride and the underworld grind. Ego deaths that do not look like events until they are.",
    truth: "A sesquare is a stone in the shoe you keep walking on.",
  },
  {
    id: "quintile",
    word: "Quintile",
    aliases: ["quintiles", "quintile"],
    info: "72°. A fifth of the circle. Talent, craft, a made thing.",
    meaning: "Not fate as lightning. Fate as something you can build with your hands.",
    truth: "A quintile is a path that is made, not found.",
  },
  {
    id: "node",
    word: "Node",
    aliases: ["north node", "south node", "true node", "nodes", "node"],
    info: "Where the Moon’s path crosses the Sun’s path. North is the hunger. South is the old craft.",
    meaning: "South node is what you already know how to perform. North node is the life that becomes real when you stop performing it.",
    truth: "The nodes are the argument between proving and housing.",
  },
  {
    id: "whole-sign",
    word: "Whole Sign",
    aliases: ["whole signs", "whole sign"],
    info: "A house system: the rising sign is the whole first house. Every sign is a house. Cusps do not split signs.",
    meaning: "Clean rooms. The 8th is the whole of that sign. Lived experience still answers to the degree on the Placidus cusp.",
    truth: "Whole Sign tells the story. Placidus tells the minute.",
  },
  {
    id: "placidus",
    word: "Placidus",
    aliases: ["placidus"],
    info: "A time-based house system. Cusps fall at whatever degree the sky had when that house opened. Signs can be intercepted.",
    meaning: "The rooms have odd doors. A planet can sit in a sign that is not the sign on the cusp.",
    truth: "Placidus is the body of the hour. Whole Sign is the name of the room.",
  },
  {
    id: "chart-ruler",
    word: "Chart ruler",
    aliases: ["chart rulers", "chart ruler"],
    info: "The planet that rules the rising sign. Sagittarius rising: Jupiter. Aries rising: Mars.",
    meaning: "The path the life actually takes, not the face at the door. Where the ruler sits is how the rising gets done.",
    truth: "The rising is the greeting. The chart ruler is the walk.",
  },
  {
    id: "chakra",
    word: "Chakra",
    aliases: ["chakras", "chakra"],
    info: "A body center. In this vault, seven of them, each ruled by planets, each a floor of the same house.",
    meaning: "The chart as a nervous system, not only a sky. Where the will sits in the body. Where the wound sits.",
    truth: "The sky is not only above you. It is the weather in the spine.",
  },
  {
    id: "tropical",
    word: "Tropical",
    aliases: ["tropical"],
    info: "The zodiac that begins at the spring equinox, not at a fixed star. Aries is the season, not the constellation.",
    meaning: "This vault uses tropical. The signs are the Earth’s year, not the telescope’s map.",
    truth: "Tropical is the season the body is born into.",
  },
  {
    id: "lilith",
    word: "Lilith",
    aliases: ["lilith"],
    info: "The Black Moon. A point, not a body: the Moon’s apogee, the far empty.",
    meaning: "The refusal that will not be domesticated. Shame’s opposite. The intensity someone is oriented by, or afraid of.",
    truth: "Do not marry the person who is ashamed of the Lilith. Marry the one oriented by it.",
  },
  {
    id: "chiron",
    word: "Chiron",
    aliases: ["chiron"],
    info: "A small body between Saturn and Uranus. The wound that teaches.",
    meaning: "Not “sad childhood” as a slogan. A specific place the life cannot fake being already solid.",
    truth: "Chiron is the medicine that starts as a limp.",
  },
  {
    id: "sun",
    word: "Sun",
    aliases: ["sun"],
    info: "The will. Daylight. The center the year turns around.",
    meaning: "Not “personality.” The life’s need to be the authentic center of its own story.",
    truth: "The Sun is the will that remains after the fusion.",
  },
  {
    id: "moon",
    word: "Moon",
    aliases: ["moon"],
    info: "The body that feels. Nightlight. Habit and hunger.",
    meaning: "Safety, loyalty, the weather you cannot argue with for long.",
    truth: "The Moon will not be talked out of a true no.",
  },
  {
    id: "mercury",
    word: "Mercury",
    aliases: ["mercury"],
    info: "Mind, speech, trade, the messenger between rooms.",
    meaning: "How the chart thinks out loud — and what it will not say.",
    truth: "Mercury signs. Impulse tries to skip the audit.",
  },
  {
    id: "venus",
    word: "Venus",
    aliases: ["venus"],
    info: "Bond, beauty, value, the yes that costs.",
    meaning: "Who and what the life is willing to keep.",
    truth: "Venus is the price of staying.",
  },
  {
    id: "mars",
    word: "Mars",
    aliases: ["mars"],
    info: "Drive, heat, fight, the cut that starts motion.",
    meaning: "How the chart asserts — cleanly or expensively.",
    truth: "Mars is the heat that will not wait politely.",
  },
  {
    id: "jupiter",
    word: "Jupiter",
    aliases: ["jupiter"],
    info: "Faith, enlargement, meaning, the horizon that keeps moving.",
    meaning: "Where the chart wants more — wisdom or inflation.",
    truth: "Jupiter makes it matter. It can also overdress a wound.",
  },
  {
    id: "saturn",
    word: "Saturn",
    aliases: ["saturn"],
    info: "Time, structure, duty, the exam that does not leave.",
    meaning: "Where the chart earns a house — or refuses to.",
    truth: "Saturn is the adult weather.",
  },
  {
    id: "uranus",
    word: "Uranus",
    aliases: ["uranus"],
    info: "Shock, break, invention, the lightning that rearranges the furniture.",
    meaning: "Liberation that does not ask permission.",
    truth: "Uranus will not keep a false peace.",
  },
  {
    id: "neptune",
    word: "Neptune",
    aliases: ["neptune"],
    info: "Dream, dissolve, ideal, the fog that can be holy or confusing.",
    meaning: "Where the chart longs past the edges of the table.",
    truth: "Neptune is the tide under the floorboards.",
  },
  {
    id: "pluto",
    word: "Pluto",
    aliases: ["pluto"],
    info: "Power, underworld, fusion, the thing that will not stay polite.",
    meaning: "Where the chart dies and remakes — total, not casual.",
    truth: "Pluto is the vault that opens whether you were ready.",
  },
];

const BY_ID: Record<string, LexEntry> = Object.fromEntries(LEXICON.map((e) => [e.id, e]));

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ALIAS_ROWS = LEXICON.flatMap((e) => e.aliases.map((alias) => ({ alias, id: e.id }))).sort(
  (a, b) => b.alias.length - a.alias.length,
);

const ALIAS_TO_ID = new Map(ALIAS_ROWS.map((r) => [r.alias.toLowerCase(), r.id]));

const GLOSS_RE = new RegExp(`\\b(${ALIAS_ROWS.map((r) => escapeRe(r.alias)).join("|")})\\b`, "gi");

export function lexById(id: string) {
  return BY_ID[id];
}

export type GlossPart = { text: string; id?: string };

export function splitGloss(text: string): GlossPart[] {
  if (!text) return [];
  const parts: GlossPart[] = [];
  const re = new RegExp(GLOSS_RE.source, GLOSS_RE.flags);
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    const id = ALIAS_TO_ID.get(m[0]!.toLowerCase());
    parts.push(id ? { text: m[0]!, id } : { text: m[0]! });
    last = m.index + m[0]!.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}
