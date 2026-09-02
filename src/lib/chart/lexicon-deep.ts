import { lexById } from "./lexicon";

/** Longer cut of a glossary word. The card is the summary. This is the page. */
export const LEX_DEEP: Record<string, string[]> = {
  planet: [
    "A planet is a moving point with a job. The ancients named seven: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn. The vault also holds Uranus, Neptune, Pluto, and a few points that behave like jobs even when they are not bodies.",
    "Do not read a planet as a person in the chart. The Sun is not “you.” It is the will — what the life keeps trying to be when nobody is watching. The Moon is the body that feels. Mercury is how the mind moves. Venus is bond and worth. Mars is heat and cut. Jupiter is faith and excess. Saturn is time and the wall.",
    "Where it sits (sign) is the climate of that job. Which house it sits in is the room of life it works in. Aspects are the other jobs it cannot ignore. Dignity is whether that job has home-field.",
    "If the degree is not tabled, do not invent a planet. The bones first. Meaning second.",
  ],
  degree: [
    "The zodiac is 360°. Each sign is 30°. A position is written sign, degree, minute: 19° Sagittarius 51′. The minute is not decoration. Two people born the same day can have different rising degrees, and then the whole house story moves.",
    "Traditional work is degree-first. Orbs are counted in degrees. Terms and bounds were slices of a sign. Exaltation degrees were named. The vault does not fake a minute it does not have.",
    "When a chart has no birth time, you still have the Sun’s degree that day. You do not have the rising. You do not have houses. That is a sun-sign shelf, not a natal.",
  ],
  house: [
    "Houses are twelve rooms of a life, counted from the rising sign. They are not the zodiac. The zodiac is the year. Houses are the hour you arrived.",
    "First is the body and the door. Second is what you hold. Third is the near road and the siblings of the mind. Fourth is the floor, the father in the old books, the private weather. Fifth is what you make and the joy that is not a job. Sixth is the work of the body, illness, the daily service.",
    "Seventh is the other chair — spouse, open enemy, the one who sits across. Eighth is other people’s life-force, death, the shared vault. Ninth is the far road, belief, the teacher. Tenth is the public roof, the work the world can name. Eleventh is allies and the future you are trying to belong to. Twelfth is the hidden, the undoing, the room behind the door.",
    "Whole Sign gives each sign to a house: the rising sign is the whole first. Placidus opens a house at a clock-cusp, so a planet can sit in a sign that is not the sign on the door. This vault will say both when a life is being read for real. A planet without a house is a feeling with no address.",
  ],
  sign: [
    "A sign is thirty degrees of the tropical year. Aries begins at the spring equinox, not at a star. Element (fire, earth, air, water) and modality (cardinal, fixed, mutable) live here.",
    "Sign is climate, not a slogan. Aries is not “a fighter.” It is the first heat. Capricorn is not “a climber.” It is the long wall. People turn signs into costumes because costumes are easy. The work is the weather you still have to walk in.",
    "A planet in a sign tells you how that job behaves. A house tells you where. Do not collapse them. Sun in Scorpio in the 11th is not “a Scorpio.” It is will, in that climate, in that room.",
  ],
  aspect: [
    "An aspect is an angle. The sky treats two points as in conversation when that angle is close enough. Ptolemy kept the majors: conjunction, sextile, square, trine, opposition. Later tables added quincunx, sesquiquadrate, quintile, and the rest.",
    "Applying means the faster planet is still closing the angle. Separating means the exact moment has passed. Traditional readers care which. The vault will name the orb so you can feel whether it is a blade or a climate.",
    "Do not read an aspect as a curse or a prize. A square is an exam. A trine is a gift you can waste. An opposition is a marriage whether you wanted one or not.",
  ],
  orb: [
    "Orb is how far an aspect is from exact, in degrees. 0° is iron. 1° is still a blade. 6° is a living weather. Different books allowed different orbs for the Sun and Moon than for Saturn.",
    "Tight orbs run the life whether you notice. Wide orbs are available — they do not drag you across the room. When two aspects compete, the tighter one usually speaks first.",
    "If you do not have degrees, you do not have an honest orb. Do not invent one from a sun-sign column.",
  ],
  retrograde: [
    "Retrograde is apparent backward motion. The Earth is passing, and the planet looks as if it is revisiting sky it already crossed. Written Rx. The Sun and Moon do not do this. The nodes have their own reverse.",
    "Traditional readers treated a retrograde as a planet that is not doing the job for the marketplace. Mercury Rx is not “computers fail.” It is mind turning over its own draft. Mars Rx is heat that will not spend itself on a public war.",
    "It is not broken. It is not a season to hide under the bed. It is a second draft the sky insisted on.",
  ],
  dignity: [
    "Essential dignity is whether a planet is in a sign it owns, a sign that honours it, a sign that works against it, or nowhere special. Domicile, exaltation, detriment, fall, peregrine.",
    "This is training, not a report card. Domicile speaks first language. Exaltation is good at the climate, sometimes too good. Detriment works overtime in a foreign factory. Fall never got comfort as the factory setting. Peregrine improvises with no shield.",
    "Accidental dignity is another layer: angular houses, speed, sect, whether the planet is rising. The vault will not pretend a peregrine angular Mars is weak. Position is not the same as sign.",
  ],
  domicile: [
    "Domicile is a planet in the sign it rules. The old list: Sun Leo, Moon Cancer, Mercury Gemini and Virgo, Venus Taurus and Libra, Mars Aries and Scorpio, Jupiter Sagittarius and Pisces, Saturn Capricorn and Aquarius.",
    "The function does not have to translate itself to exist. It still has aspects. It still has a house. Domicile is not a free pass. It is a locked room that belongs to you, which means you also have to keep it.",
  ],
  exaltation: [
    "Exaltation is honour without ownership. Moon in Taurus, Sun in Aries, Mercury in Virgo, Venus in Pisces, Mars in Capricorn, Jupiter in Cancer, Saturn in Libra. There are named degrees in the old books; this vault uses the sign unless a research chart tables the degree.",
    "The function is unusually competent in that climate. Competence can become the adult in every room. Exaltation is a gift with a job, not a halo.",
  ],
  detriment: [
    "Detriment is the sign opposite domicile. Jupiter in Gemini or Virgo. Venus in Aries or Scorpio. Saturn in Cancer or Leo. The job still gets done. It spends more to do the same thing.",
    "Do not read it as doomed. Traditional work said the planet is out of its kingdom, not out of work. Overtime, not a funeral.",
  ],
  fall: [
    "Fall is opposite exaltation. Moon in Scorpio. Sun in Libra. Mars in Cancer. The ordinary comfort of that function does not ship from the factory.",
    "Fall is not evil. It is a second country. The Moon in Scorpio does not fail at feeling. It fails at casual feeling. That is a different sentence.",
  ],
  peregrine: [
    "Peregrine means the planet has no essential dignity or debility in that sign. No home, no exile, no honour, no fall.",
    "It improvises. In an angular house it can still run a life. In a cadent house it can drift. Peregrine is a guest who still has to pay rent — not a ghost.",
  ],
  intercepted: [
    "Interception happens in quadrant houses (Placidus, Koch, Regiomontanus). A sign is swallowed inside a house and never appears on a cusp. Its opposite is intercepted too.",
    "Whole Sign does not intercept. That is one reason this vault sets Whole Sign beside Placidus on a timed chart. The intercepted climate has no front door; it leaks through the houses on either side, or it waits in the walls until a transit knocks.",
    "Do not “heal” an interception. Live in the room even when the handle is on the next door.",
  ],
  rising: [
    "The Ascendant is the degree of the tropical zodiac on the eastern horizon at the minute of birth. It opens the first house. Without a time, you do not have it. A noon chart is a guess dressed as a face.",
    "Traditional work called it the horoskopos — the hour-marker. It is the body at the door: appearance, arrival, the way life starts a sentence. People meet this first. They do not meet the Sun until they stay.",
    "The planet that rules the rising sign is the chart ruler. That planet’s house and condition is how the greeting actually gets walked. Sagittarius rising with Jupiter in Virgo is not a lucky wanderer. It is a greeting that has to be earned with craft.",
  ],
  descendant: [
    "The Descendant is opposite the rising, the western horizon, the seventh cusp. Open enemies and open vows live here in the old lists. Modern talk flattened it to “relationships.” The older word is the Other.",
    "You will project it. You will marry it, fight it, hire it, or become it. The sign on the descendant is the climate of the person who sits in the other chair — not a shopping list for a spouse.",
  ],
  midheaven: [
    "The Midheaven is the highest point of the ecliptic at birth, the tenth in quadrant houses. Reputation, office, the work that can be named in public. In Whole Sign the tenth sign from the rising is the public roof even when the MC degree falls in another sign.",
    "This vault will tell you when they disagree. The MC degree is the minute of the career sky. The tenth sign is the story of the roof. Both can be true in one life.",
  ],
  ic: [
    "Imum Coeli: the lowest sky, fourth house in quadrant systems, opposite the midheaven. Home, the private weather, the end of things, the parent the old books called the father, the ground you actually sleep on.",
    "People decorate the midheaven and abandon the IC. Then they wonder why the public roof feels like a set. The IC is not nostalgia. It is the floor.",
  ],
  vertex: [
    "The Vertex is a western intersection of the ecliptic and the prime vertical. Not a planet. Not in Ptolemy. A modern doorway that this vault still names when a research chart tables it.",
    "It behaves like fusion: people and events that arrive already written. It does not date lightly, even when you tell yourself you are dating lightly. Treat it as a note, not as law, unless the degree is on the page.",
  ],
  conjunction: [
    "0°, or close. Two functions in the same body of sky. They do not take turns. A Sun-Mercury conjunction thinks with the will. A Moon-Pluto conjunction feels with the underworld.",
    "Out-of-sign conjunctions (29° of one sign, 1° of the next) still count if the orb is tight. Traditional readers argued about that. The vault will say the degrees and let the life answer.",
  ],
  sextile: [
    "60°, signs of compatible element but different modality. Opportunity. The old books said it was a weak friendly, not a fate.",
    "You have to pick up the tool. A sextile between two dignified planets is a workshop. A sextile you never act on is a door that stayed shut and then you called it bad luck.",
  ],
  square: [
    "90°. Same modality, different element. Cardinal squares start fights and cities. Fixed squares dig in. Mutable squares scatter and reassemble.",
    "This is how a life gets a spine. The two jobs interrupt each other until they become a craft. Do not pray it away. Pass the exam.",
  ],
  trine: [
    "120°, same element. Fire trines burn clean. Earth trines build. Air trines talk. Water trines bind.",
    "Talent that runs whether you steer. That is the danger. A trine can go lazy, holy, or both. Name the gift. Then use it, or admit you are wasting it.",
  ],
  opposition: [
    "180°. Face to face. Full moon is the Moon opposing the Sun. The other chair is built into the angle.",
    "What you oppose, you marry — in the sense that you will keep meeting it until you own the half you parked on the other side of the wheel. Projection is the cheap version. Partnership is the expensive one that works.",
  ],
  quincunx: [
    "150°, also called the inconjunct. No shared element, no shared modality. The two functions cannot count in the same units.",
    "Not a Ptolemaic major. Still a lived adjust: compensation, translation, a slight lifelong limp between two jobs. Do not force it into a square. Let it be the awkward that taught the craft.",
  ],
  sesquare: [
    "135°, the sesquiquadrate. An off-square. Irritation that does not resolve into a clean fight. Ego and the underworld grind in small repeated deaths.",
    "You will think it is nothing until the stone in the shoe is a year old. Name the two planets. Name the orb. Then stop calling it bad luck.",
  ],
  quintile: [
    "72°, a fifth of the circle. Kepler cared. Most traditional nativities did not. This vault names it when the research chart tables a craft-angle.",
    "Not lightning fate. Fate as something made with the hands. A quintile is a path you build, not a path that finds you on a Tuesday.",
  ],
  node: [
    "The lunar nodes are where the Moon’s path crosses the Sun’s. North is the hunger, the life that is not yet a performance. South is the old craft, the thing you can do in your sleep and will keep doing for applause if you are not careful.",
    "This vault uses the True Node when a research chart says so. Mean Node is a smoothing. Do not mix them in one sentence. The nodes are the argument between proving and housing — not a past-life souvenir unless you chose that theology.",
  ],
  "whole-sign": [
    "Whole Sign houses: the rising sign, all thirty degrees of it, is the first house. The next sign is the second, and so on. The Midheaven degree may fall in the 9th or 11th and still the tenth sign is the public roof.",
    "Valens and Dorotheus work this way in the example charts. It is clean. Topics stay in rooms. It will not intercept a sign.",
    "When this vault sets Whole Sign beside Placidus, it is not indecision. It is two clocks. The story and the minute.",
  ],
  placidus: [
    "Placidus is a time-house system: each cusp is the degree that was on that house’s temporal hour at birth. Signs can be intercepted. A planet can sit in a sign that is not the sign on the cusp.",
    "This is the body of the hour. It is why a research chart can say Whole Sign 9th and Placidus 8th in one life, and both can be lived. Do not pick a team to win an argument. Read the degree.",
  ],
  "chart-ruler": [
    "The chart ruler is the domicile lord of the rising sign. Aries or Scorpio rising: Mars. Taurus or Libra: Venus. Gemini or Virgo: Mercury. Cancer: Moon. Leo: Sun. Sagittarius or Pisces: Jupiter. Capricorn or Aquarius: Saturn.",
    "Where that planet sits — house, sign, aspects — is how the rising actually walks. The greeting is the Ascendant. The walk is the ruler. If you only read the face, you miss the path.",
  ],
  chakra: [
    "In this vault a chakra is a body center mapped to the chart, not a substitute for houses. Seven floors: root through crown. Planets and aspects can sit on a floor.",
    "They are not a sidebar on the fly-through. They appear when a chart is locked — in the body of the figure. Do not use them to diagnose disease. They are a map of attention, heat, and the weather in the spine.",
  ],
  tropical: [
    "Tropical zodiac: 0° Aries is the spring equinox, the season, not the star field named Aries in a telescope. Sidereal zodiacs pin signs to constellations and have drifted by a long way from the equinox.",
    "This house is tropical. Mixing sidereal into a tropical wheel is how degrees start lying. If you want Jyotish, that is another sky, another contract, another desk.",
  ],
  lilith: [
    "Black Moon Lilith is the Moon’s apogee — a point, not a rock. There is also an asteroid named Lilith. This vault means the empty far point unless a research chart says otherwise.",
    "It names a refusal that will not be domesticated. Shame’s opposite. Not a glamour. Not a license to harm. If someone is ashamed of this point in a chart, they will try to housebreak the life. That never holds.",
  ],
  chiron: [
    "Chiron is a small body between Saturn and Uranus, named for the tutor who could not heal himself. Not in the seven. Named in the 1970s. This vault still tables it on a research chart because the wound-that-teaches is a lived fact, not a brand.",
    "Read the sign and house as the place the life cannot fake being already solid. Do not turn it into a sad childhood slogan. Specific, or silent.",
  ],
};

export function lexDeep(id: string): string[] {
  const listed = LEX_DEEP[id];
  if (listed?.length) return listed;
  const e = lexById(id);
  if (!e) return [];
  return [e.info, e.meaning, e.truth];
}
