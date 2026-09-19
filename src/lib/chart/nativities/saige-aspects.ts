/** Saige aspect wires — owner research only. */
import type { AspectDef } from "../aspects";

export const ASPECTS: AspectDef[] = [
  { id: "ve-ma", a: "venus", b: "mars", type: "sextile", orb: 0.03, iron: true, text: "Desire and taste are one animal. Magnetism." },
  { id: "sa-mc", a: "saturn", b: "mc", type: "square", orb: 0.07, iron: true, text: "Public life is the relationship and duty exam." },
  { id: "ma-pl", a: "mars", b: "pluto", type: "trine", orb: 0.98, iron: true, text: "Can move power. Will that works in the dark." },
  { id: "ve-pl", a: "venus", b: "pluto", type: "opposition", orb: 0.95, iron: true, text: "Love is fusion or it is nothing. Power in the bond." },
  { id: "su-pl", a: "sun", b: "pluto", type: "sesquare", orb: 0.62, iron: true, text: "Pride and the underworld grind each other. Ego deaths." },
  { id: "sa-pl", a: "saturn", b: "pluto", type: "quincunx", orb: 0.67, iron: true, text: "Control versus control. Adjust or seize. Lifelong." },
  { id: "pl-mc", a: "pluto", b: "mc", type: "sextile", orb: 0.6, iron: true, text: "Vocation can carry real depth, real power, cleanly." },
  { id: "sa-no", a: "saturn", b: "node", type: "quintile", orb: 0.17, iron: true, text: "Fate has a craft. The path is made, not found." },
  { id: "pl-as", a: "pluto", b: "asc", type: "conjunction", orb: 4.72, iron: false, text: "Presence that rearranges the room." },
  { id: "ve-as", a: "venus", b: "asc", type: "opposition", orb: 3.78, iron: false, text: "The Other is the mirror. Partnership as identity." },
  { id: "ma-as", a: "mars", b: "asc", type: "trine", orb: 3.72, iron: false, text: "Heat in the first impression, under the Sagittarius grin." },
  { id: "mo-me", a: "moon", b: "mercury", type: "square", orb: 3.98, iron: false, text: "Feel / name. The stutter that makes a writer." },
  { id: "me-ur", a: "mercury", b: "uranus", type: "opposition", orb: 4.67, iron: false, text: "Lightning mind. Cannot live in a stupid consensus." },
  { id: "su-no", a: "sun", b: "node", type: "square", orb: 2.78, iron: false, text: "The will and the fate-path argue. Ego versus becoming." },
  { id: "ju-pl", a: "jupiter", b: "pluto", type: "square", orb: 2.23, iron: false, text: "Faith versus power. Don’t preach past the wound." },
  { id: "ve-ju", a: "venus", b: "jupiter", type: "square", orb: 3.18, iron: false, text: "Overdo love, overdo hope, then Virgo-correct it." },
  { id: "ju-sa", a: "jupiter", b: "saturn", type: "sextile", orb: 1.56, iron: false, text: "The grown-up gift: vision that can take a schedule." },
  { id: "ve-mc", a: "venus", b: "mc", type: "trine", orb: 1.55, iron: false, text: "Public grace. People want to work with her." },
  { id: "ma-mc", a: "mars", b: "mc", type: "sextile", orb: 1.58, iron: false, text: "Public heat. She can fight for the work." },
  { id: "su-ur", a: "sun", b: "uranus", type: "quincunx", orb: 1.76, iron: false, text: "Identity must keep adjusting to the glitch." },
  { id: "mo-ma", a: "moon", b: "mars", type: "square", orb: 6.52, iron: false, text: "Feeling-anger. Don’t skip it; it will not skip her." },
  { id: "su-mo", a: "sun", b: "moon", type: "trine", orb: 6.88, iron: false, text: "Wide, applying. Pride and depth can be one thing." },
];
