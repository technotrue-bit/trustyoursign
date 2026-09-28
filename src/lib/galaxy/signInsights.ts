import type { SignId } from "@/lib/chart/types";

/** Tone of a post-profile galaxy star insight. */
export type InsightTone = "info" | "spicy" | "horror" | "warning";

export type SignInsight = {
  tone: InsightTone;
  title: string;
  body: string;
};

const TONE_LABEL: Record<InsightTone, string> = {
  info: "Insight",
  spicy: "Spicy",
  horror: "Horror",
  warning: "Warning",
};

export function insightToneLabel(tone: InsightTone) {
  return TONE_LABEL[tone];
}

/**
 * Per-sign star lore for unlocked galaxy explore.
 * Order cycles across travel points after the hub.
 */
export const SIGN_INSIGHTS: Record<SignId, SignInsight[]> = {
  aries: [
    {
      tone: "info",
      title: "First heat",
      body: "Aries does not wait for permission. The chart’s first fire is a body that moves before the story has a title.",
    },
    {
      tone: "spicy",
      title: "The private strike",
      body: "Your appetite for beginning can look like arrogance to people who need a committee. It is not a stage — it is a match.",
    },
    {
      tone: "horror",
      title: "Burnout as identity",
      body: "If every Tuesday must be a first day, you will mistreat the life that already started. Exhaustion dressed as destiny.",
    },
    {
      tone: "warning",
      title: "Do not outsource the spark",
      body: "When you wait for someone else to light you, the ram turns mean. Keep one beginning that is only yours.",
    },
    {
      tone: "info",
      title: "Cardinal fire",
      body: "Cardinal means the door opens in you. Fire means the opening has temperature. Together: a step that still exists later.",
    },
    {
      tone: "spicy",
      title: "Pride without an audience",
      body: "The hottest Aries flex is refusing to perform the fight. Heat that does not need witnesses.",
    },
    {
      tone: "horror",
      title: "The empty war",
      body: "Some rams invent enemies so the week has a plot. Check whether the battle is real before you bleed for it.",
    },
    {
      tone: "warning",
      title: "Feet first",
      body: "Root work: if your body cannot take the step, the speech about courage is theater. Start where your feet are.",
    },
  ],
  taurus: [
    {
      tone: "info",
      title: "Enoughness",
      body: "Taurus is the nervous system allowed to come down. Worth that can be touched, kept, fed.",
    },
    {
      tone: "spicy",
      title: "Slow as a flex",
      body: "Your refusal to rush is erotic to the right people and unbearable to the wrong ones. That is the filter.",
    },
    {
      tone: "horror",
      title: "Stuck as safety",
      body: "Comfort can become a locked room. If nothing moves for years, the floor is a coffin with nice sheets.",
    },
    {
      tone: "warning",
      title: "Do not outsource the body",
      body: "Food, land, sleep, money — if you abandon these to chaos, the bull will hold a grudge in the flesh.",
    },
    {
      tone: "info",
      title: "Fixed earth",
      body: "Fixed means you stay. Earth means the stay has weight. Beauty here is not a mood — it is a practice.",
    },
    {
      tone: "spicy",
      title: "Possessive tenderness",
      body: "You love by keeping. Say so early, or people will call it control when it was devotion with a fence.",
    },
    {
      tone: "horror",
      title: "The holy boring that dies",
      body: "When you confuse numbness with peace, the garden goes quiet for the wrong reason.",
    },
    {
      tone: "warning",
      title: "Stay, but not trapped",
      body: "Root medicine is stay — not freeze. If the land is poisoned, leaving is still Taurus: protecting the body.",
    },
  ],
  gemini: [
    {
      tone: "info",
      title: "Two channels",
      body: "Gemini is bandwidth. Talk as a way of arriving. Duplication is not always indecision.",
    },
    {
      tone: "spicy",
      title: "The conversation that is already a kiss",
      body: "Your mind flirts before your hands do. People feel chosen by your questions — use that carefully.",
    },
    {
      tone: "horror",
      title: "Nowhere to land",
      body: "If every bond is a draft, you will die unread. Wit without a home becomes noise that eats intimacy.",
    },
    {
      tone: "warning",
      title: "One throat, two stories",
      body: "Say which voice is speaking. Split truths without naming them will make you untrustworthy to yourself.",
    },
    {
      tone: "info",
      title: "Mutable air",
      body: "Mutable: you change lanes. Air: the lane is language. The mouth is an engine — fuel it with honesty.",
    },
    {
      tone: "spicy",
      title: "Twin appetite",
      body: "You can love two plots at once. The scandal is pretending you cannot. The craft is consent.",
    },
    {
      tone: "horror",
      title: "Gossip as bloodsport",
      body: "Information without mercy is a blade. Your sign can cut people who thought they were in a chat.",
    },
    {
      tone: "warning",
      title: "Finish one sentence",
      body: "Before you open a new tab in the heart, close one. Scattered Gemini is brilliant and lonely.",
    },
  ],
  cancer: [
    {
      tone: "info",
      title: "The shell",
      body: "Cancer needs safety before the room gets you. Mood is weather — not a moral failure.",
    },
    {
      tone: "spicy",
      title: "Belonging as seduction",
      body: "You make people feel mothered and wanted. That power can become a leash if you are not honest about need.",
    },
    {
      tone: "horror",
      title: "The flood",
      body: "Unheld feeling does not disappear — it soaks the floorboards. Private weather becomes a private drowning.",
    },
    {
      tone: "warning",
      title: "Do not outsource the nest",
      body: "If home only exists inside other people, you will punish them for leaving. Build one shell that is yours.",
    },
    {
      tone: "info",
      title: "Cardinal water",
      body: "Cardinal: you begin by caring. Water: the care has tide. Memory is a tool — and a trap.",
    },
    {
      tone: "spicy",
      title: "Soft armor",
      body: "Your tenderness is not weakness. People who mock it are bidding for free labor. Charge admission.",
    },
    {
      tone: "horror",
      title: "Clinging to the ghost",
      body: "Some crabs keep a dead bond alive in the shell. Check whether you are protecting love or a museum.",
    },
    {
      tone: "warning",
      title: "Name the need",
      body: "Hints are not contracts. If you need holding, say hold me — or the tide will speak for you.",
    },
  ],
  leo: [
    {
      tone: "info",
      title: "The will that remains",
      body: "Leo wants an authentic center — not applause alone. Pride here is refusal to be made small.",
    },
    {
      tone: "spicy",
      title: "Furnace, not stage light",
      body: "You glow even when the room is empty. The right people orbit that heat. The wrong ones try to dim you.",
    },
    {
      tone: "horror",
      title: "Performance as cage",
      body: "If you only exist when watched, the vault becomes a zoo. Loneliness with perfect lighting.",
    },
    {
      tone: "warning",
      title: "Do not rent your center",
      body: "When you trade the heart for status, Leo turns brittle. Keep one desire that is not for sale.",
    },
    {
      tone: "info",
      title: "Fixed fire",
      body: "Fixed: the flame stays lit. Fire: it wants to be seen. Generosity is your native language — budget it.",
    },
    {
      tone: "spicy",
      title: "Royal appetite",
      body: "You want to be chosen loudly. Ask for it cleanly instead of punishing people for failing a silent audition.",
    },
    {
      tone: "horror",
      title: "The empty throne",
      body: "Ego without devotion is a crown on a skull. Check whether the kingdom still has subjects you respect.",
    },
    {
      tone: "warning",
      title: "Warmth with edges",
      body: "Shine does not require cruelty. If you burn people to feel bright, the light is fake.",
    },
  ],
  virgo: [
    {
      tone: "info",
      title: "The craft",
      body: "Virgo makes it accurate, then sacred. Discrimination is love with a checklist.",
    },
    {
      tone: "spicy",
      title: "Competence as foreplay",
      body: "You get turned on by things that work. Chaos is not romantic to you — and that is allowed.",
    },
    {
      tone: "horror",
      title: "The infinite edit",
      body: "If nothing is ever finished, the life stays in draft. Perfectionism can starve the body you meant to heal.",
    },
    {
      tone: "warning",
      title: "Do not weaponize the standard",
      body: "Critique without care becomes contempt. Sort the fire into work that can be kept — including people’s dignity.",
    },
    {
      tone: "info",
      title: "Mutable earth",
      body: "Mutable: you adjust the plan. Earth: the plan must still feed someone. Service is not self-erasure.",
    },
    {
      tone: "spicy",
      title: "Quiet dominance",
      body: "You run rooms by fixing what others ignore. Name the power so no one calls it ‘just helping.’",
    },
    {
      tone: "horror",
      title: "Body as project",
      body: "When the flesh is only a problem to solve, Virgo turns clinical. Illness can become an identity factory.",
    },
    {
      tone: "warning",
      title: "Leave one beautiful mess",
      body: "Keep a corner that is not optimized. The sacred ordinary needs a little dirt to stay alive.",
    },
  ],
  libra: [
    {
      tone: "info",
      title: "The in-between",
      body: "Libra wants a true weight. Diplomacy is the heart’s craft — two, not one, as a practice.",
    },
    {
      tone: "spicy",
      title: "Charm with a blade",
      body: "You can make peace look easy. People forget you are also measuring them. Let them know the scale exists.",
    },
    {
      tone: "horror",
      title: "No self in the mirror",
      body: "If every choice is for the room’s comfort, you disappear. A life of pleasing is a soft annihilation.",
    },
    {
      tone: "warning",
      title: "Decide, then stay",
      body: "Indecision is not fairness. Pick a side when the bond needs one — or resentment will pick for you.",
    },
    {
      tone: "info",
      title: "Cardinal air",
      body: "Cardinal: you initiate relation. Air: relation is speech and style. Beauty is a moral argument here.",
    },
    {
      tone: "spicy",
      title: "Aesthetic honesty",
      body: "You notice imbalance in the first five seconds. That taste is intelligence — not vanity.",
    },
    {
      tone: "horror",
      title: "The false peace",
      body: "Some scales stay level by hiding the heavier truth. Politeness that buries conflict will rot the partnership.",
    },
    {
      tone: "warning",
      title: "Two does not mean none",
      body: "Partnership is not self-cancellation. Bring a self to the table or there is nothing to balance.",
    },
  ],
  scorpio: [
    {
      tone: "info",
      title: "All-in or out",
      body: "Scorpio does not do halfway. The hook under the pretty floor is the point.",
    },
    {
      tone: "spicy",
      title: "Desire with teeth",
      body: "You want fusion, not flirting. People who want light will call you intense. Correct — and selective.",
    },
    {
      tone: "horror",
      title: "The underworld career",
      body: "If every bond must be a death-and-rebirth, you will manufacture endings. Trauma as a lifestyle brand.",
    },
    {
      tone: "warning",
      title: "Do not test in secret",
      body: "Tests people fail without knowing they were tested are cruelty. Name the stake or drop the exam.",
    },
    {
      tone: "info",
      title: "Fixed water",
      body: "Fixed: the feeling stays. Water: it saturates. Loyalty here is a blood oath — budget who gets it.",
    },
    {
      tone: "spicy",
      title: "Power literacy",
      body: "You see who holds the knife in the room. Use that sight to protect, not to collect blackmail.",
    },
    {
      tone: "horror",
      title: "Possession as love",
      body: "When jealousy becomes the whole weather, intimacy dies. Control is not depth — it is fear in makeup.",
    },
    {
      tone: "warning",
      title: "Survive, then choose",
      body: "You can endure almost anything. That is not a reason to endure the wrong thing. Exit is also Scorpio.",
    },
  ],
  sagittarius: [
    {
      tone: "info",
      title: "The arrow",
      body: "Sagittarius aims. A life that will not stay small. The sentence is the weapon.",
    },
    {
      tone: "spicy",
      title: "Honest to a fault (and a gift)",
      body: "You say the unspeakable at dinner. Some leave. Some finally breathe. Know which room you are in.",
    },
    {
      tone: "horror",
      title: "Meaning addiction",
      body: "If every week needs a quest, ordinary love will feel like death. You can burn the village looking for God.",
    },
    {
      tone: "warning",
      title: "Do not preach the escape",
      body: "Freedom that abandons people is just flight. Aim, then stay long enough for the arrow to matter.",
    },
    {
      tone: "info",
      title: "Mutable fire",
      body: "Mutable: the path changes. Fire: belief has heat. Philosophy here must still walk on Tuesday.",
    },
    {
      tone: "spicy",
      title: "Big appetite",
      body: "You want more sky. Ask for expansion without treating the people who love you as luggage.",
    },
    {
      tone: "horror",
      title: "The empty sermon",
      body: "Hot takes without lived cost make you a billboard. Check whether you are teaching or performing.",
    },
    {
      tone: "warning",
      title: "Return with the story",
      body: "Travel is holy. Ghosting is not. Bring the insight home or the arrow never lands.",
    },
  ],
  capricorn: [
    {
      tone: "info",
      title: "Time as a mountain",
      body: "Capricorn climbs. The architecture of a Tuesday that holds. Ambition with a skeleton.",
    },
    {
      tone: "spicy",
      title: "Competence kink",
      body: "You respect people who build. Soft chaos may charm you once — structure keeps you.",
    },
    {
      tone: "horror",
      title: "The empty summit",
      body: "If the mountain costs every soft thing, you arrive alone with a title. Success can be a beautiful tomb.",
    },
    {
      tone: "warning",
      title: "Do not postpone the life",
      body: "‘After the next goal’ is a spell. Schedule joy like a deadline or Capricorn will work until the body files a complaint.",
    },
    {
      tone: "info",
      title: "Cardinal earth",
      body: "Cardinal: you initiate structure. Earth: structure must bear weight. Legacy is a verb.",
    },
    {
      tone: "spicy",
      title: "Quiet authority",
      body: "You do not need to shout. People feel the standard. Name it so they are not guessing in fear.",
    },
    {
      tone: "horror",
      title: "Shame as fuel",
      body: "Some goats climb to outrun humiliation. The mountain does not heal that — it only delays the mirror.",
    },
    {
      tone: "warning",
      title: "Rest is part of the build",
      body: "Collapse is not a badge. A durable life includes sleep, tenderness, and exits from bad contracts.",
    },
  ],
  aquarius: [
    {
      tone: "info",
      title: "Water in the air",
      body: "Aquarius speaks for the weather, not the brand. Future-facing, un-ownable, weird on purpose.",
    },
    {
      tone: "spicy",
      title: "Detachment as heat",
      body: "Your cool can be magnetic. People chase the distance. Do not confuse mystery with refusal to be known.",
    },
    {
      tone: "horror",
      title: "The lonely network",
      body: "A hundred acquaintances and no one who can call you at 3 a.m. Ideals without intimacy freeze the heart.",
    },
    {
      tone: "warning",
      title: "Do not exile the body",
      body: "If the future always wins against the present person in front of you, you will wake up abstract and alone.",
    },
    {
      tone: "info",
      title: "Fixed air",
      body: "Fixed: the principle stays. Air: it moves through groups. Revolution needs a table and a dish to wash.",
    },
    {
      tone: "spicy",
      title: "Uncaged loyalty",
      body: "You will not be owned — and you will fight for the free. Say what freedom costs in your bonds.",
    },
    {
      tone: "horror",
      title: "People as experiments",
      body: "When humans become case studies, Aquarius turns clinical. Curiosity without care is a lab accident.",
    },
    {
      tone: "warning",
      title: "Belong without branding",
      body: "Community is not a costume. Show up when it is boring, or your ideals are cosplay.",
    },
  ],
  pisces: [
    {
      tone: "info",
      title: "Two fish, one cord",
      body: "Pisces is the dream that still has a body. Return, not escape — if you can tell the difference.",
    },
    {
      tone: "spicy",
      title: "Porous magic",
      body: "You feel rooms before words arrive. That sensitivity is glamorous until you forget to have a self.",
    },
    {
      tone: "horror",
      title: "Dissolution as romance",
      body: "If you vanish into every lover, art, or substance, the cord snaps. Mysticism can be a beautiful disappearance.",
    },
    {
      tone: "warning",
      title: "Keep one shore",
      body: "Compassion without boundaries is a flood. Choose who gets your rain — and who gets a closed door.",
    },
    {
      tone: "info",
      title: "Mutable water",
      body: "Mutable: you shapeshift. Water: you absorb. The last sign holds the whole year — and can drown in it.",
    },
    {
      tone: "spicy",
      title: "Devotion that melts clocks",
      body: "You love in mythic scale. Tell people the terms before they think they signed up for a fairytale.",
    },
    {
      tone: "horror",
      title: "The beautiful lie",
      body: "Some fish prefer the dream to the repair. Soft denial will cost harder truth later.",
    },
    {
      tone: "warning",
      title: "Return with a body",
      body: "Crown work: transcendence that still eats breakfast. If the vision cannot survive Tuesday, it is escape.",
    },
  ],
};

export function insightsForSign(signId: SignId): SignInsight[] {
  return SIGN_INSIGHTS[signId] ?? SIGN_INSIGHTS.aries;
}

/**
 * The sky-dock sample for the sign on screen: that sign's Insight register.
 * Callers must pass the current sign. A fixed sign here keeps the previous
 * reading on the card after the viewer flies somewhere else.
 */
export function sampleInsightForSign(signId: SignId): SignInsight | undefined {
  const insights = insightsForSign(signId);
  return insights.find((item) => item.tone === "info") ?? insights[0];
}
