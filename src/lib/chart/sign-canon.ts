import type { Element, Modality, SignId } from "./types";

/** Aries-first tropical order — single list for math, validation, and UI mapping. */
export const SIGN_IDS: readonly SignId[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type SignCanonEntry = {
  id: SignId;
  name: string;
  abbr: string;
  startLon: number;
  element: Element;
  modality: Modality;
  /** Short civil span, e.g. "Mar 21 – Apr 19". */
  dates: string;
  /** Long civil span, e.g. "March 21 – April 19". */
  month: string;
};

/** One identity record per SignId — name, dates, element. Layers (art, copy, figures) sit on top. */
export const SIGN_CANON: Record<SignId, SignCanonEntry> = {
  aries: {
    id: "aries",
    name: "Aries",
    abbr: "Ari",
    startLon: 0,
    element: "fire",
    modality: "cardinal",
    dates: "Mar 21 – Apr 19",
    month: "March 21 – April 19",
  },
  taurus: {
    id: "taurus",
    name: "Taurus",
    abbr: "Tau",
    startLon: 30,
    element: "earth",
    modality: "fixed",
    dates: "Apr 20 – May 20",
    month: "April 20 – May 20",
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    abbr: "Gem",
    startLon: 60,
    element: "air",
    modality: "mutable",
    dates: "May 21 – Jun 20",
    month: "May 21 – June 20",
  },
  cancer: {
    id: "cancer",
    name: "Cancer",
    abbr: "Can",
    startLon: 90,
    element: "water",
    modality: "cardinal",
    dates: "Jun 21 – Jul 22",
    month: "June 21 – July 22",
  },
  leo: {
    id: "leo",
    name: "Leo",
    abbr: "Leo",
    startLon: 120,
    element: "fire",
    modality: "fixed",
    dates: "Jul 23 – Aug 22",
    month: "July 23 – August 22",
  },
  virgo: {
    id: "virgo",
    name: "Virgo",
    abbr: "Vir",
    startLon: 150,
    element: "earth",
    modality: "mutable",
    dates: "Aug 23 – Sep 22",
    month: "August 23 – September 22",
  },
  libra: {
    id: "libra",
    name: "Libra",
    abbr: "Lib",
    startLon: 180,
    element: "air",
    modality: "cardinal",
    dates: "Sep 23 – Oct 22",
    month: "September 23 – October 22",
  },
  scorpio: {
    id: "scorpio",
    name: "Scorpio",
    abbr: "Sco",
    startLon: 210,
    element: "water",
    modality: "fixed",
    dates: "Oct 23 – Nov 21",
    month: "October 23 – November 21",
  },
  sagittarius: {
    id: "sagittarius",
    name: "Sagittarius",
    abbr: "Sag",
    startLon: 240,
    element: "fire",
    modality: "mutable",
    dates: "Nov 22 – Dec 21",
    month: "November 22 – December 21",
  },
  capricorn: {
    id: "capricorn",
    name: "Capricorn",
    abbr: "Cap",
    startLon: 270,
    element: "earth",
    modality: "cardinal",
    dates: "Dec 22 – Jan 19",
    month: "December 22 – January 19",
  },
  aquarius: {
    id: "aquarius",
    name: "Aquarius",
    abbr: "Aqu",
    startLon: 300,
    element: "air",
    modality: "fixed",
    dates: "Jan 20 – Feb 18",
    month: "January 20 – February 18",
  },
  pisces: {
    id: "pisces",
    name: "Pisces",
    abbr: "Pis",
    startLon: 330,
    element: "water",
    modality: "mutable",
    dates: "Feb 19 – Mar 20",
    month: "February 19 – March 20",
  },
};

export function parseSignId(id: string): SignId {
  if ((SIGN_IDS as readonly string[]).includes(id)) return id as SignId;
  throw new Error("Unknown sign");
}

export function isSignId(id: string): id is SignId {
  return (SIGN_IDS as readonly string[]).includes(id);
}

export function signName(id: SignId): string {
  return SIGN_CANON[id].name;
}

export function signIndexOf(id: SignId): number {
  return SIGN_IDS.indexOf(id);
}
