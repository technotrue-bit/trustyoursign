import { CHAKRAS } from "../chakras";
import type { AspectDef } from "../aspects";
import type { ChakraDef } from "../chakras";
import type { GateDef, ReadingDef, StepDef } from "../copy";
import { JOEY_ANGLES } from "../geometry";
import type { HouseCusp } from "../houses";
import { PLANET_LOOK, type PlanetDef } from "../planets";
import type { Nativity } from "../schema";
import { SIGNS, type SignDef } from "../signs";
import type { PlanetId } from "../types";

const ARI = 0;
const TAU = 30;
const GEM = 60;
const CAN = 90;
const LEO = 120;
const VIR = 150;
const LIB = 180;
const SCO = 210;
const SAG = 240;
const CAP = 270;
const AQU = 300;
const PIS = 330;

function lon(base: number, d: number, m: number): number {
  return base + d + m / 60;
}

function p(
  id: PlanetId,
  fields: Omit<PlanetDef, "id" | "color" | "glow" | "size" | "radius" | "glyph" | "name"> & {
    name: string;
    glyph: string;
  },
): PlanetDef {
  return { id, ...PLANET_LOOK[id], ...fields };
}

const PLANETS: PlanetDef[] = [
  p("asc", {
    name: "Ascendant",
    glyph: "ASC",
    lon: lon(GEM, 2, 14),
    house: 1,
    wholeSign: 1,
    retrograde: false,
    dignity: "angle",
    headline: "The messenger. People meet the talk long before they meet the pilgrim.",
    why: "You do not find yourself alone. You find yourself in conversation, in a counterpart, in an audience.",
    body: [
      "Gemini rising at 2° is early, so the sign is undiluted: fast intake, two channels open, hands and mouth busy, allergic to a dead room.",
      "Neptune is trine this Ascendant at 0.3° — almost exact. The messenger isn’t dry. People project onto you. You can seem mythic, slightly ungraspable, kinder or stranger than you feel on the inside. The cost: you can disappear into other people’s version of you.",
      "Chart ruler is Mercury, sitting on the Descendant. Identity is relational. When you don’t have a worthy other, the Gemini mask starts spinning in place — more tabs, more ideas, more motion, less you.",
    ],
    note: "2° Gemini 14′ · chart face · ruler Mercury on the DSC",
  }),
  p("sun", {
    name: "Sun",
    glyph: "Sun",
    lon: lon(SAG, 21, 25),
    house: 7,
    wholeSign: 7,
    retrograde: false,
    dignity: "domicile",
    headline: "The will is a compass. It lives in the other.",
    why: "Is this true, is this bigger, is this alive, or is this a stall?",
    body: [
      "The Sun is in domicile. This is a strong Sun. Underneath the options, there is a compass. Sagittarius cannot bear a small meaning. You will outgrow rooms, cities, jobs, and even selves that were honest last year. That is not flakiness. That is the Sun doing its job.",
      "It sits in the 7th house. You become most yourself in the field between you and someone. A life with no witness will depress this Sun even if the Aquarius Moon likes the quiet.",
      "Sun conjunct Black Moon Lilith, 0.03°. Exact to the minute. Lilith is the unedited appetite — the part that will not be made polite. Shame, when it shows up, will attach here. The work is not to shrink it. The work is to aim it.",
      "Sabian for 22° Sagittarius: “A Chinese laundry.” Purification as daily labor. Your solar job is not to be a guru on a hill. It is to keep cleaning the meaning until it’s wearable.",
    ],
    note: "21° Sagittarius 25′ · 7th · domicile · partile Lilith",
  }),
  p("moon", {
    name: "Moon",
    glyph: "Moon",
    lon: lon(AQU, 26, 20),
    house: 9,
    wholeSign: 9,
    retrograde: false,
    dignity: "peregrine",
    headline: "A dry Moon. Understood, not handled.",
    why: "You will starve in a clingy bond, and starve equally in a life with no people-of-the-mind.",
    body: [
      "Aquarius is a dry Moon. It does not want to be merged with. It wants to be understood without being handled. You feel first as a thought. “I’m fine” can be true in your head and false in your body for a long time.",
      "When you finally feel it, it arrives as principle: this isn’t fair, this is fake, I have to get out, we should build something better. Unnamed sadness will look like restlessness, ideology, or a sudden need to redesign your life.",
      "26° is late Aquarius — the sign fully cooked. You already know how to be the outsider. You do not need more practice at detachment. The Moon in the 9th wants sky: ideas, distance, future, a philosophy that makes the feeling make sense.",
      "Sabian for 27° Aquarius: “An ancient pottery bowl filled with fresh violets.” The cool container is there so something tender can survive.",
    ],
    note: "26° Aquarius 20′ · 9th · peregrine · waxing ~29%",
  }),
  p("mercury", {
    name: "Mercury",
    glyph: "Merc",
    lon: lon(SAG, 3, 53),
    house: 7,
    wholeSign: 7,
    retrograde: false,
    dignity: "detriment",
    headline: "The chart ruler on the other. You talk to know what you think.",
    why: "You would rather be vividly wrong than precisely boring.",
    body: [
      "Mercury in detriment is not a weak mind. Gemini Mercury dices. Sagittarius Mercury throws the whole spear. You think in theses, punches, visions, punchlines, doctrines.",
      "Because this Mercury rules your Rising and sits on the Descendant (1.7° from DSC): you decide out loud; you attract people who are minds first; you can promise the horizon before the road exists. That is the detriment: honesty without a measuring tape.",
      "Mercury is 17½° behind the Sun — a morning star, oriental. The mind leads. Then the will has to live with what the mouth already said. Conjunct Pluto (wide) and Chiron: the voice can go surgical. People will remember what you said longer than you think.",
    ],
    note: "3° Sagittarius 53′ · 7th · detriment · on the DSC",
  }),
  p("venus", {
    name: "Venus",
    glyph: "Ven",
    lon: lon(SCO, 9, 18),
    house: 6,
    wholeSign: 6,
    retrograde: false,
    dignity: "detriment",
    headline: "The hardest personal planet. Wired into the T-square.",
    why: "Casual is a foreign language you can mimic and cannot live in.",
    body: [
      "Detrimented Venus in Scorpio does not do “like.” It does all-in or out. Attraction has a temperature. Loyalty is the currency.",
      "Opposite Saturn, 1.8° — the tightest relationship aspect you have. Wanting is never casual. Love, money, and beauty come with a bill, a test, or a delay. You take them seriously or you refuse them.",
      "6th house: love shows up as work, craft, service, the daily body. You bond with people you build with or suffer a process with. Usefulness is erotic. Competence is trust.",
      "Square Mars–Uranus: desire collides with freedom. The adult version is: stay, but restlessly, and take the lightning out on the work instead of the person.",
    ],
    note: "9° Scorpio 18′ · 6th · detriment · opp. Saturn 1.8°",
  }),
  p("mars", {
    name: "Mars",
    glyph: "Mars",
    lon: lon(AQU, 13, 32),
    house: 9,
    wholeSign: 9,
    retrograde: false,
    dignity: "peregrine",
    headline: "The strike. On the Midheaven. Glued to Uranus.",
    why: "A normal job, slowly, will always feel like a costume.",
    body: [
      "Mars in Aquarius, on the MC, 0.4° from the Midheaven, conjunct Uranus: you do not grind in a straight line. You charge when the idea is live, in a burst, often public, often technical, often against the current way.",
      "You were born 14 hours before the exact Mars–Uranus conjunction of December 14, 1999. That is a once-in-a-couple-of-years sky, sitting on your career angle. Your public signature is original force, applied in a system, in front of people.",
      "Out-of-sect Mars plus Uranus: the strike can be earlier and hotter than the situation warrants. You will call it honesty or efficiency. Other people will call it a bomb. Both can be true.",
      "Sabian for 14° Aquarius: “A train entering a tunnel.” Once you enter, you go through.",
    ],
    note: "13° Aquarius 32′ · 9th / on the MC · 0.4° from MC",
  }),
  p("jupiter", {
    name: "Jupiter",
    glyph: "Jup",
    lon: lon(ARI, 25, 5),
    house: 11,
    wholeSign: 11,
    retrograde: true,
    dignity: "peregrine",
    headline: "The Sun’s ruler. Luck through starting — internalized.",
    why: "You do not quite believe the easy yes. You have to reinvent faith for yourself.",
    body: [
      "Jupiter feeds the will. In Aries: luck through nerve, through being first. It is retrograde and seven days from stationing direct. Rx Jupiter doesn’t deny fortune. It internalizes it.",
      "11th house: the gain comes through allies, scenes, the future-crowd, networks. You are not a lone-wolf success chart, however independent the Moon is.",
      "Sun trine Jupiter (3.7°) and Moon sextile Jupiter (1.3°): this is real buoyancy. You recover. Doors open that match the quest. Do not confuse that with invincibility. Confuse it with: you are allowed to bet on a larger life.",
    ],
    note: "25° Aries 05′ · 11th · Rx · stations direct 7 days later",
  }),
  p("saturn", {
    name: "Saturn",
    glyph: "Sat",
    lon: lon(TAU, 11, 3),
    house: 12,
    wholeSign: 12,
    retrograde: true,
    dignity: "peregrine",
    headline: "The private standard. The floor-builder.",
    why: "You hold a private standard no one else can see, and you fail it more often than you fail the world.",
    body: [
      "Retrograde in the 12th: the taskmaster lives inside, out of view. The 12th is the back room — sleep, fear, the unnamed, the thing you do not put on the resume.",
      "Taurus Saturn: the lesson is slow and bodily. Money that lasts. A body that is not treated like a vehicle you can redline. Work that compounds. You can philosophize at light speed and still be in a 20-year class on staying.",
      "Because Saturn opposes Venus, the 12th-house fear often wears a relationship or money mask: I will be left. I will not have enough. Wanting will cost me my freedom. The fear is not a prophecy. It is the gym.",
    ],
    note: "11° Taurus 03′ · 12th · Rx · opp. Venus 1.8°",
  }),
  p("uranus", {
    name: "Uranus",
    glyph: "Ura",
    lon: lon(AQU, 13, 57),
    house: 9,
    wholeSign: 9,
    retrograde: false,
    dignity: "domicile",
    headline: "Reinvention is not background. It is the job title.",
    why: "When the want/duty axis locks, you do something sudden in public.",
    body: [
      "Uranus in Aquarius on the MC, 0.8° from the Midheaven, conjunct Mars inside one degree. Your generation’s “reinvent the system” is personalized as vocation.",
      "Both square Venus and Saturn. When the wire tightens, you don’t sit with it. You do something public and sudden — a new build, a cut, a launch, a disappearance, a reinvention. From outside it looks like ambition. Underneath it is often: Venus reached; Saturn said not like that.",
    ],
    note: "13° Aquarius 57′ · 9th / on the MC · modern home",
  }),
  p("neptune", {
    name: "Neptune",
    glyph: "Nep",
    lon: lon(AQU, 2, 35),
    house: 9,
    wholeSign: 9,
    retrograde: false,
    dignity: "peregrine",
    headline: "The future you sell can be a real vision or a beautiful fog.",
    why: "Other people believe your maybe. Check it against Saturn before you bet the house.",
    body: [
      "Neptune in Aquarius, 2°35′, trine the Ascendant 0.3°. Doors open that a harsher Gemini would have to talk their way through.",
      "The 9th-house pile (Moon, Mars, Uranus, Neptune) adds publishing, teaching, media, belief, long-range vision, the thing that travels farther than you do. Pisces on the 10th wants soul, image, a myth, not just a schematic. Engine plus myth. That’s the vocational fingerprint.",
    ],
    note: "2° Aquarius 35′ · 9th · 0.3° trine ASC",
  }),
  p("pluto", {
    name: "Pluto",
    glyph: "Plu",
    lon: lon(SAG, 10, 46),
    house: 7,
    wholeSign: 7,
    retrograde: false,
    dignity: "peregrine",
    headline: "Power in partnership. There is almost no casual setting.",
    why: "Partnerships transform you or they become power struggles.",
    body: [
      "Pluto in Sagittarius in the 7th, conjunct Chiron: the search for meaning after the old gods died happens through people.",
      "There is a healer in it: you can sit with someone else’s abyss without flinching. You will meet your wound in the other. That’s the curriculum. The medicine is the same room: honest speech that doesn’t flinch, and a bond that can survive a transformation.",
    ],
    note: "10° Sagittarius 46′ · 7th · conjunct Chiron",
  }),
  p("chiron", {
    name: "Chiron",
    glyph: "Chi",
    lon: lon(SAG, 9, 23),
    house: 7,
    wholeSign: 7,
    retrograde: false,
    dignity: "peregrine",
    headline: "Wound and medicine in the 7th.",
    why: "You will meet the wound in the other. That is not a curse. It is the classroom.",
    body: [
      "Chiron in Sagittarius in the 7th, with Pluto and the Sun’s house. The sore place is belief, honesty, the horizon you promised, the partner as teacher.",
      "Mercury conjuncts this from 5½°. The voice can go surgical because it has been cut. The medicine is the same speech, aimed, not withheld, not used as a spear for sport.",
    ],
    note: "9° Sagittarius 23′ · 7th · wound / medicine",
  }),
  p("lilith", {
    name: "Lilith",
    glyph: "Lil",
    lon: lon(SAG, 21, 23),
    house: 7,
    wholeSign: 7,
    retrograde: false,
    dignity: "peregrine",
    headline: "The unedited appetite is welded to the will.",
    why: "The work is not to shrink it. The work is to aim it.",
    body: [
      "Mean Lilith partile conjunct the Sun, 0.03°. The unedited appetite is not a side character.",
      "In Sagittarius, on the Sun, in the 7th: a raw honesty about desire and belief that other people call “too much” until they need it.",
    ],
    note: "21° Sagittarius 23′ · 7th · partile Sun",
  }),
  p("node", {
    name: "North Node",
    glyph: "Node",
    lon: lon(LEO, 6, 1),
    house: 3,
    wholeSign: 3,
    retrograde: true,
    dignity: "peregrine",
    headline: "Down and in. The next sentence, in your actual voice.",
    why: "Ease is not in becoming more unique. You are already unique. Ease is in letting the unique thing be warm and specific.",
    body: [
      "South Node Aquarius 9th: you already know how to be the detached genius, the future-mind, the one who sees the system from above. Overused, it becomes exile. You watch your own life.",
      "North Node Leo 3rd conjunct Fortune at 7°10′. The T-square empties into this same Leo. When security, desire, and lightning lock, the way through is not a fourth explosion. It is a courageous, personal word.",
      "Say the thing with your chest. Put your name on it. Stay in the room after you say it.",
    ],
    note: "6° Leo 01′ · 3rd · conjunct Fortune 7°10′ · SN Aquarius 9th",
  }),
  p("mc", {
    name: "Midheaven",
    glyph: "MC",
    lon: lon(AQU, 13, 6),
    house: 10,
    wholeSign: 10,
    retrograde: false,
    dignity: "angle",
    headline: "The ridge of the roof. Original force, in public.",
    why: "Not a well-behaved specialist in someone else’s machine, unless you are rewriting the machine.",
    body: [
      "Aquarius 13°06′, with Mars 0.4° and Uranus 0.8° sitting on it. You are built to do public, original, high-voltage work that changes how a system runs.",
      "Whole Sign 10th is Pisces. The world sees the Aquarius machine; Pisces 10th wants soul, image, a myth, not just a schematic. Engine plus myth.",
      "Saturn in the 12th: the unseen hours matter more than the announcement. If you only live on launches, Saturn will collect in the body, the books, or the crash after the spike.",
    ],
    note: "13° Aquarius 06′ · 10th angle · Mars–Uranus pile",
  }),
];

const planetById = Object.fromEntries(PLANETS.map((x) => [x.id, x])) as Record<PlanetId, PlanetDef>;

const HOUSES: HouseCusp[] = [
  { house: 1, lon: GEM, label: "1 · Gemini · ASC 2°14′" },
  { house: 2, lon: CAN, label: "2 · Cancer" },
  { house: 3, lon: LEO, label: "3 · Leo · Node · Fortune" },
  { house: 4, lon: VIR, label: "4 · Virgo · IC in Leo next door" },
  { house: 5, lon: LIB, label: "5 · Libra" },
  { house: 6, lon: SCO, label: "6 · Scorpio · Venus" },
  { house: 7, lon: SAG, label: "7 · Sagittarius · Sun · DSC" },
  { house: 8, lon: CAP, label: "8 · Capricorn" },
  { house: 9, lon: AQU, label: "9 · Aquarius · Moon · Mars · Uranus" },
  { house: 10, lon: PIS, label: "10 · Pisces · MC in Aquarius" },
  { house: 11, lon: ARI, label: "11 · Aries · Jupiter Rx" },
  { house: 12, lon: TAU, label: "12 · Taurus · Saturn Rx" },
];

const IN_CHART: Record<string, { headline: string; body: string; inChart: string }> = {
  aries: {
    headline: "The bet. The start.",
    body: "Aries is nerve. First move. Heat that does not wait for a committee.",
    inChart: "Jupiter Rx at 25°05′ in the 11th. Luck through starting, through allies, through being first — internalized. You have to reinvent faith for yourself.",
  },
  taurus: {
    headline: "The floor.",
    body: "Taurus is enoughness: money that lasts, a body that is not a vehicle, work that compounds.",
    inChart: "Saturn Rx at 11°03′ in the 12th. The hidden ledger. The money wound is private. The prescription is a floor, not a vibe.",
  },
  gemini: {
    headline: "The face and the nervous system.",
    body: "Gemini is two channels, talk, options, motion. Allergic to a dead room.",
    inChart: "Rising 2°14′. People meet the messenger. Chart ruler Mercury sits on the other side of the sky. Identity is a conversation.",
  },
  cancer: {
    headline: "Worth that needs to feel safe.",
    body: "Cancer is the body-home of belonging. Safety before excitement.",
    inChart: "Empty 2nd. Ruler is the Aquarius Moon: you are rich when free and in a true future, not when clutched.",
  },
  leo: {
    headline: "The growth room. Heart, voice, the near.",
    body: "Leo is visible sincerity — not performance, presence.",
    inChart: "North Node 6°01′ and Fortune 7°10′ in the 3rd. IC at 13°06′. The T-square empties here. Say the thing with your chest.",
  },
  virgo: {
    headline: "The private shop.",
    body: "Virgo is craft, order, a working kitchen of the soul.",
    inChart: "4th house. Home wants order, not a crash pad. Competence is the floor of the life.",
  },
  libra: {
    headline: "Play that needs a counterpart.",
    body: "Libra creates with and for. Romance as art.",
    inChart: "Empty 5th. You make things with someone in the room, even if the someone is an audience.",
  },
  scorpio: {
    headline: "Craft as devotion.",
    body: "Scorpio does not dabble. Daily work is intimate.",
    inChart: "Venus at 9°18′ in the 6th, in detriment. Health and labor are how love behaves. Usefulness is erotic.",
  },
  sagittarius: {
    headline: "The main stage. The other. You.",
    body: "Sagittarius wants a life that means something — truth, range, a bigger map.",
    inChart: "Sun, Mercury, Pluto, Chiron, Lilith, DSC. The 7th is overcrowded. Choose the other as if you were choosing a climate.",
  },
  capricorn: {
    headline: "The deep end, on a delay, for keeps.",
    body: "Capricorn is time, structure, the underworld of other people’s resources.",
    inChart: "Empty 8th. Ruler is Saturn in the 12th. You meet merger privately. Not casual. For keeps.",
  },
  aquarius: {
    headline: "Native genius. Also the hide.",
    body: "Aquarius wants a life that does not trap you — space, principle, the future, not being owned.",
    inChart: "Moon, Mars, Uranus, Neptune, South Node, and the MC degree. Belief, publishing, the big idea. Also the hide when being warmly seen feels too exposing.",
  },
  pisces: {
    headline: "Vocation as vision.",
    body: "Pisces wants soul, image, a myth, not just a schematic.",
    inChart: "Whole Sign 10th. Part of Spirit at 27°17′. The world sees the Aquarius machine; this house wants the myth that machine is for.",
  },
};

const signs: SignDef[] = SIGNS.map((s) => ({
  ...s,
  intercepted: false,
  headline: IN_CHART[s.id]?.headline ?? s.headline,
  body: IN_CHART[s.id]?.body ?? s.body,
  inChart: IN_CHART[s.id]?.inChart ?? s.inChart,
}));

const ASPECTS: AspectDef[] = [
  { id: "ve-sa", a: "venus", b: "saturn", type: "opposition", orb: 1.75, iron: true, text: "The tightest contract. Wanting is never casual. Love and money on one wire." },
  { id: "ma-ur", a: "mars", b: "uranus", type: "conjunction", orb: 0.42, iron: true, text: "Once-in-years sky on the career angle. Original force." },
  { id: "ma-mc", a: "mars", b: "mc", type: "conjunction", orb: 0.43, iron: true, text: "The strike is public. 0.4° from the Midheaven." },
  { id: "ur-mc", a: "uranus", b: "mc", type: "conjunction", orb: 0.85, iron: true, text: "Reinvention is the job title." },
  { id: "su-li", a: "sun", b: "lilith", type: "conjunction", orb: 0.03, iron: true, text: "Unedited appetite welded to the will." },
  { id: "ne-as", a: "neptune", b: "asc", type: "trine", orb: 0.35, iron: true, text: "People project. Doors open. Check the maybe against Saturn." },
  { id: "sa-ma", a: "saturn", b: "mars", type: "square", orb: 2.48, iron: true, text: "Duty versus voltage. The T-square’s one arm." },
  { id: "ve-ma", a: "venus", b: "mars", type: "square", orb: 4.23, iron: true, text: "Desire collides with freedom. The other arm." },
  { id: "sa-ur", a: "saturn", b: "uranus", type: "square", orb: 2.9, iron: true, text: "The floor versus the launch." },
  { id: "ve-ur", a: "venus", b: "uranus", type: "square", orb: 4.65, iron: true, text: "Bond versus lightning." },
  { id: "me-as", a: "mercury", b: "asc", type: "opposition", orb: 1.65, iron: true, text: "Chart ruler on the DSC. You talk to know what you think." },
  { id: "su-ju", a: "sun", b: "jupiter", type: "trine", orb: 3.67, iron: false, text: "Real buoyancy. The quest is allowed." },
  { id: "mo-ju", a: "moon", b: "jupiter", type: "sextile", orb: 1.25, iron: false, text: "The dry Moon still gets a door." },
  { id: "pl-ch", a: "pluto", b: "chiron", type: "conjunction", orb: 1.38, iron: false, text: "Wound and power in the same room — the 7th." },
  { id: "no-fo", a: "node", b: "sun", type: "trine", orb: 4.6, iron: false, text: "The growth line can feed the will if you come down and in." },
];

const visual = Object.fromEntries(CHAKRAS.map((c) => [c.id, c]));

const CHAKRA_COPY: ChakraDef[] = [
  {
    ...visual.root,
    rulers: ["saturn"],
    headline: "The floor. Enough. A body that is not the crash site.",
    body: [
      "Saturn Rx in Taurus in the 12th is the prescription: money that lasts, a body that is not treated like a vehicle you can redline, work that compounds.",
      "Earth and water are the vitamins. You will not get them by accident. 12th-house Saturn collects what you will not look at — sleep, hidden costs, the unmarked fear.",
      "Root is not more lightning. Root is a number in the account that means you can leave a bad room.",
    ],
    practice: "Write the hidden ledger down. Floor before lightning. If a move requires raiding the floor, it is not destiny.",
  },
  {
    ...visual.sacral,
    rulers: ["venus", "lilith"],
    headline: "All-in or out. Usefulness is erotic.",
    body: [
      "Venus in Scorpio in the 6th, in detriment, opposite Saturn. You don’t “like.” You bind. Loyalty is the currency. Casual is a language you can speak and cannot live in.",
      "You bond with people you build with or suffer a process with. Atmosphere-only romance bores this Venus. Competence is trust.",
      "Lilith on the Sun: the unedited appetite is welded to the will. Do not shrink it. Aim it.",
    ],
    practice: "Say the want before the test. Stop using suffering as proof. Start using time plus speech.",
  },
  {
    ...visual.solar,
    rulers: ["mars", "uranus", "sun"],
    headline: "The strike. Public, sudden, original.",
    body: [
      "Mars–Uranus–MC in Aquarius 13° is the apex of the T-square. When the want/duty axis locks, you do not process it quietly.",
      "Out-of-sect Mars plus Uranus: the strike can be earlier and hotter than the situation warrants. A normal job, slowly, will always feel like a costume.",
      "The Sun in Sagittarius in the 7th aims this heat: is it true, is it bigger, or is it a stall? Use the Sun and Jupiter to aim Mars.",
    ],
    practice: "Lightning is allowed after Venus, Saturn, and the Moon have spoken. Not instead of them.",
  },
  {
    ...visual.heart,
    rulers: ["venus", "saturn", "node"],
    headline: "Love and money on one wire. The T-square empties into Leo.",
    body: [
      "Venus opposite Saturn is not “a hard aspect.” It is the tightest personal contract in the chart, and it rules the two things adults don’t get to fake: who you keep, and what you can keep.",
      "North Node Leo 3rd conjunct Fortune: from being a concept to being a person people can warm their hands on. Heart, courage, visible sincerity — not performance, presence.",
      "You are allowed to want a love that is both loyal and spacious. That is not greed. That is the aspect pattern.",
    ],
    practice: "Stop making people and paychecks prove they won’t abandon you. Choose the ones that can stay, then stay without the exam.",
  },
  {
    ...visual.throat,
    rulers: ["mercury", "asc", "node"],
    headline: "The next sentence, said in your actual voice.",
    body: [
      "Gemini rising. Mercury on the Descendant, in detriment: you talk to know what you think; you can promise the horizon before the road exists. Say the miles.",
      "North Node in the 3rd: talk, write, teach small, repeat, be heard in the room you’re in. The overpromise is the shadow. The medicine is the same mouth, measured.",
      "When the T-square locks, the way through is a courageous, personal word. Stay in the room after you say it.",
    ],
    practice: "One true sentence you respect. Then close. Gemini that never closes is fatal.",
  },
  {
    ...visual.brow,
    rulers: ["moon", "neptune", "uranus"],
    headline: "You feel first as a thought. Give it sky, not a small room.",
    body: [
      "Aquarius Moon in the 9th: travel, study, a bigger frame, a night drive, a conversation that goes until the map changes — those regulate you better than “talk about your feelings” in a small room.",
      "Neptune trine the Ascendant: the vision can be real or fog. Uranus on the MC: the future-mind is native. Overused, it becomes exile. You watch your own life.",
      "You already know how to be the outsider. You do not need more practice at detachment.",
    ],
    practice: "Check whether you need a new life or a night of sky and one true conversation.",
  },
  {
    ...visual.crown,
    rulers: ["sun", "jupiter"],
    headline: "A life that means something. Faith reinvented by hand.",
    body: [
      "Sagittarius Sun in domicile in the 7th: the will is not blurred. Jupiter, the Sun’s ruler, in Aries Rx in the 11th: luck through starting, through the crew, through nerve — and you do not quite believe the easy yes.",
      "Day chart. The Sun and Jupiter are on your side. Use them to aim Mars.",
      "You are not here to look like a CEO of endurance. You are here to think in public, bind for real, and build what doesn’t exist yet — without abandoning the heart that has to live in the building.",
    ],
    practice: "Bet on a larger life. Then let Saturn decide if the engine has a chassis.",
  },
];

const GATES: GateDef[] = [
  {
    id: "rising",
    name: "Rising",
    kicker: "2° Gemini 14′",
    headline: "The face, the nervous system, the first move.",
    body: [
      "People meet the messenger long before they meet the pilgrim or the rebel. Fast intake. Allergic to a dead room.",
      "Neptune trine 0.3°. You can seem mythic. The cost is disappearing into other people’s version of you.",
      "The split that will follow you: you appear flexible. You are not. The persona is mutable. The will is fixed. Once something is yours, you do not casually put it down.",
    ],
  },
  {
    id: "sun",
    name: "Sun",
    kicker: "21° Sagittarius 25′ · 7th · domicile",
    headline: "Who you are when nobody is performing.",
    body: [
      "The Sun wants a life that means something — truth, range, a bigger map. In the 7th, identity runs through the other.",
      "Partile Lilith. Raw honesty about desire and belief. The work is to aim it.",
      "A noon chart once gave you a Capricorn rising that was never yours. This Sun did not move. The face did. This book uses the timed chart only.",
    ],
  },
  {
    id: "moon",
    name: "Moon",
    kicker: "26° Aquarius 20′ · 9th",
    headline: "What you need before you can be kind to yourself.",
    body: [
      "The Moon wants a life that does not trap you — space, principle, the future, not being owned.",
      "Friends who are equals. Space inside love. A future to point at. That is lunar food.",
      "If the Moon says no, you will saboteur later even if you signed. Veto power. Do not skip it.",
    ],
  },
];

const STEPS: StepDef[] = [
  {
    n: 1,
    title: "Mercury / Gemini",
    body: "Let me gather, compare, talk it out, keep options. Useful for research. Fatal if it never closes.",
  },
  {
    n: 2,
    title: "Sagittarius Sun",
    body: "Does this make the life larger? Is it true? Best compass. Can confuse “new” with “true.”",
  },
  {
    n: 3,
    title: "Aquarius Moon",
    body: "Will I still belong to myself? Veto power. If the Moon says no, you will saboteur later even if you signed.",
  },
  {
    n: 4,
    title: "The T-square",
    body: "Prove it (Venus–Saturn) versus blow the doors (Mars–Uranus). The 2 a.m. argument. Security versus voltage.",
  },
];

const READINGS: ReadingDef[] = [
  {
    id: "love",
    name: "Love",
    headline: "You are not empty of love. You are incompatible with lukewarm.",
    body: [
      "The Sun lives in the house of partnership. You become in company. Venus in Scorpio opposite Saturn: you attach like it’s a blood oath, then test, then fear the bill. Mars–Uranus: you need oxygen inside the oath. No oxygen, you become lightning.",
      "Chart ruler on the DSC: the beloved is a mind. If you cannot talk for three hours, it is not your person, however pretty. Pluto / Chiron in the 7th: you will meet your wound in the other.",
      "What works: a peer with their own quest, who does not need to own your nervous system, who likes the talk, who can go deep without theater, and who is not frightened when you reinvent the machine.",
      "What does not work: being managed, being the project, being the audience, being the secret, being the stable one while someone else gets to be free.",
    ],
  },
  {
    id: "work",
    name: "Work",
    headline: "Engine plus myth. Original force, in public.",
    body: [
      "Midheaven Aquarius 13°, Mars and Uranus on it. You are built to do public, original, high-voltage work that changes how a system runs.",
      "The 9th-house pile adds publishing, teaching, media, belief, the thing that travels farther than you do. Pisces 10th: it has to have soul. A dry schematic will not feed you. A pretty myth with no engine will not either.",
      "Jupiter in the 11th: work grows when it has a crew and a future tribe. Saturn in the 12th: the unseen hours matter more than the announcement.",
      "You will outgrow work that is merely competent. Competence is the floor. Meaning plus invention is the ceiling.",
    ],
  },
  {
    id: "wound",
    name: "Shadow",
    headline: "This is a reference, not a compliment.",
    body: [
      "The charming exit. Gemini rising plus Mars–Uranus: you can leave a room, a job, a person, mid-sentence, and call it honesty. Sometimes it is. Sometimes it is fear of the Venus–Saturn bill.",
      "The thesis instead of the feeling. You will explain your heart until nobody, including you, can find it.",
      "The test. You make people prove they won’t leave, then resent them for the proving.",
      "The overpromise. The map is beautiful. The miles are real. Say the miles.",
      "The private cruelty. Saturn Rx in the 12th: you may forgive others faster than you forgive yourself, or punish yourself in secret and look easygoing in public.",
      "The power fog. People will hand you a role. You can wear it so well you forget it isn’t the Sun.",
      "Restlessness as fake destiny. Not every impulse is Uranus on the MC. Some of it is an unfed Moon.",
    ],
  },
  {
    id: "becoming",
    name: "Growth",
    headline: "From sky-philosophy to the next sentence, said in your actual voice.",
    body: [
      "South Node Aquarius 9th is the old skill. Overused, it becomes exile.",
      "North Node Leo 3rd conjunct Fortune: down and in. From the network to the near. Leo: heart, courage, visible sincerity. 3rd house: talk, write, teach small, be heard in the room you’re in.",
      "When security, desire, and lightning lock, the way through is not a fourth explosion. It is a courageous, personal word. Put your name on it. Stay in the room after you say it.",
      "You are not here to look like a CEO of endurance. You are here to think in public, bind for real, and build what doesn’t exist yet — without abandoning the heart that has to live in the building. That is the chart. It will still be true at 80.",
    ],
  },
  {
    id: "wire",
    name: "Venus–Saturn",
    headline: "They are the same planet, doing the same job, on two clocks.",
    body: [
      "Venus Scorpio 9°18′ 6th, 1.8° opposition, Saturn Taurus 11°03′ Rx 12th. Intensity as evidence versus duration as evidence. Most charts split love and money. Yours does not. They are one circuit: can I want this, and will it last?",
      "Ugly loop: get close → Venus wants blood-oath depth → Saturn asks will this last → Moon says don’t own me → you test them or withhold → they fail a test they didn’t know they were taking → Mars–Uranus bolts → loneliness → repeat.",
      "Adult loop: stop using suffering as proof and start using time plus speech. Say the want before the test. Give Saturn a real job: is this still here in a year if we tell the truth? Give Uranus a real job: do I have oxygen inside the oath?",
      "Adult money is boring on purpose. Taurus doesn’t want a myth. It wants a floor. Launches sit on a Saturn floor, or the floor disappears and you call it destiny. Floor before lightning. Pay the craft, not the mood. One circuit for love and money. Hidden costs are Saturn’s favorite tool.",
    ],
  },
  {
    id: "return",
    name: "Saturn return",
    headline: "August 22, 2028: the planet stops on your Saturn. Not a mood. A date.",
    body: [
      "Natal Saturn 11°03′ Taurus, 12th, Rx. On August 22, 2028, Saturn stations retrograde at 11°18′ Taurus — fifteen arcminutes from natal Saturn. Most people get a flyby. You get a station.",
      "2026 is the foyer: Saturn in Aries, 11th, auditing the crew. Don’t start the return early by blowing up your life. Practice clean yes / clean no. Make the hidden ledger visible.",
      "2027 is the dress rehearsal: Saturn conjunct natal Jupiter three times. Luck gets a reality check. December 23, 2027, station at 21° Aries trines the Sun — backbone for the quest if you tell the truth.",
      "2028 is the door. April 12 Saturn enters Taurus. July, first opposition to Venus. August 22, the peak. 12th house: build the private floor. If you only perform the return in public, you miss it.",
      "2029 cements: April 9 final exact return. May–June square to Mars–Uranus–MC. September 6 station nearly opposite the Moon. 2030: live in the building. June, Saturn enters Gemini — a new class of the face. That is not this book.",
    ],
  },
];

export const JOEY: Nativity = {
  id: "joey",
  person: "you",
  meta: {
    name: "Joey Devin Norris",
    date: "Monday, 13 December 1999",
    time: "4:11 PM EST",
    place: "DeKalb Medical Center, Decatur, Georgia",
    coords: "33.79° N, 84.28° W",
    zone: "America/New_York · UTC−5 · no DST",
    julian: "2451526.4243",
    zodiac: "Tropical",
    houses: "Whole Sign (Equal agrees)",
    node: "Mean Node as tabled",
    engine: "Timed from the birth certificate",
    sunAltitude: "Day chart — Sun still above the western horizon",
    oneCut: "A truth-seeking will wearing a talker’s face.",
    thesis:
      "You are a truth-seeking will wearing a talker’s face, with an independent nervous system, whose public life is built to break stale systems — and whose private life is a fight between hunger for loyal intensity and hunger for absolute freedom.",
  },
  angles: JOEY_ANGLES,
  planets: PLANETS,
  planetById,
  houses: HOUSES,
  elements: { fire: 3, earth: 1, air: 2, water: 1 },
  modalities: { cardinal: 1, fixed: 4, mutable: 3 },
  signs,
  aspects: ASPECTS,
  chakras: CHAKRA_COPY,
  chakraById: Object.fromEntries(CHAKRA_COPY.map((c) => [c.id, c])) as Nativity["chakraById"],
  gates: GATES,
  gateById: Object.fromEntries(GATES.map((g) => [g.id, g])) as Nativity["gateById"],
  steps: STEPS,
  decisionClose:
    "A clean decision: it is true (Sun); it leaves you uninhabited by anyone else’s script (Moon); you can say it in a sentence you respect (Mercury); it asks you to stay and build, not only to spark (Saturn); it is allowed to be new (Uranus); it happens with a worthy other (7th); it costs something real. Cheap yeses feel like lies to this Venus.",
  readings: READINGS,
  readingById: Object.fromEntries(READINGS.map((r) => [r.id, r])),
  suggested: [
    "Who am I in this? Am I telling a true story, or wearing a projection?",
    "What do I need? Do I have space, a future, and one equal?",
    "Why did I say that? Did I find myself, or perform a self?",
    "Why is this love or money so heavy?",
    "Why did I blow it up?",
    "What would the grown version do?",
    "What year is it on the Saturn clock?",
    "Was Venus driving, or did Mars–Uranus blow the doors?",
  ],
  alwaysLabel: ["sun", "moon", "venus", "mars", "saturn", "asc"],
  extraBones: [
    { name: "Part of Fortune", pos: "7° Leo 10′", house: "3rd", note: "Conjunct North Node" },
    { name: "Part of Spirit", pos: "27° Pisces 17′", house: "10th", note: "Vocation as vision" },
    { name: "South Node", pos: "6° Aquarius 01′", house: "9th", note: "The old skill you overuse" },
    { name: "Imum Coeli", pos: "13° Leo 06′", house: "4th angle", note: "Private root / family myth" },
  ],
  canonExtra: `HOW TO USE THIS BOOK
This is not a horoscope column. It is a reference. Two layers stay separate. The sky — degrees, signs, angles, retrogrades — is astronomy. Recalculated from the birth certificate against the December 1999 sky. It will not change. The reading is the old language of temperament.

If you rebuild this on astro.com: December 13, 1999, 4:11 PM, Decatur, GA. Whole Sign and Equal houses put every planet in the same house in this chart. Placidus only disagrees on one thing: it puts Mars, Uranus, and the Moon in or on the 10th because they sit on the Midheaven. Both sentences are true.

A noon chart was the first draft. That version gave a Capricorn rising that was never yours. Discard any note that still calls this a Capricorn-rising chart.

THE ONE SENTENCE
You are a truth-seeking will wearing a talker's face, with an independent nervous system, whose public life is built to break stale systems — and whose private life is a fight between hunger for loyal intensity and hunger for absolute freedom.

That fight is a fixed T-square:
Apex: Mars–Uranus–MC in Aquarius 13° — the action, the public strike.
One arm: Saturn Rx in Taurus 11° — security, time, the body, money.
Other arm: Venus in Scorpio 9° — desire, bond, proof, depth.
The empty leg is Leo. North Node Leo 6°. Fortune Leo 7°. The chart is not confused about the medicine.

HOUSEHOLD FLOOR
1. Floor before lightning.
2. Pay the craft, not the mood.
3. One circuit for love and money.
4. Hidden costs are Saturn's favorite tool.

SATURN RETURN TIMELINE
2026: 11th / Aries. Crew, courage, foyer. Jul 26–Dec 10 Rx.
2027: Saturn on Jupiter three passes (Jun 10–22; Sep 27–Oct 10 Rx; Mar 1–11 2028). Dec 23 2027 station at 21° Aries trines the Sun.
Apr 12 2028: Saturn enters Taurus. 12th house door.
May 18 2028: return shadow 4°25′ Taurus.
Jul 2028: first opposition to Venus.
early–mid Aug 2028: first kiss of natal Saturn.
Aug 22 2028: station Rx at 11°18′ Taurus. THE RETURN PEAK.
Oct 2028: Venus opposition #2.
Jan 5 2029: Saturn direct at 4°24′ Taurus.
Mar 2029: Venus opposition #3 — the one that counts.
Apr 9 2029: 11°19′ Taurus. Final exact return.
May–Jun 2029: square Mars–Uranus–MC.
Sep 6 2029: station 25°01′ Taurus, nearly opposite the Moon.
2030: finish Taurus. Jun 1 2030 Saturn enters Gemini — new cycle of the face.

Saturn doesn't ruin lives. It removes what cannot carry weight and cements what can. Ugly version: crisis does the choosing. Adult version: you choose before the crisis has to.

WHAT THIS BOOK IS NOT
It is not a prediction that a specific person will leave, a specific business will fail, or a specific dollar amount will arrive. Saturn grades structure. Venus grades what you try to keep. You still choose.

Keep the intensity, drop the test. Keep the lightning, pour a floor. Keep the freedom, make it a home you can actually sleep in. That is the whole assignment. The calendar is just so you don't have to guess when it comes due.
The chart does not end.`,
  machineTitle: "How you decide.",
  readingsTitle: "Love, work, shadow, the wire, the return.",
};
