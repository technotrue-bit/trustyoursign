export type HouseCusp = {
  house: number;
  lon: number;
  label: string;
};

export const HOUSE_CUSPS: HouseCusp[] = [
  { house: 1, lon: 24 + 34 / 60 + 240, label: "ASC · Sagittarius" },
  { house: 2, lon: 2 + 35 / 60 + 300, label: "2 · Aquarius" },
  { house: 3, lon: 14 + 40 / 60 + 330, label: "3 · Pisces" },
  { house: 4, lon: 19 + 15 / 60, label: "IC · Aries" },
  { house: 5, lon: 14 + 57 / 60 + 30, label: "5 · Taurus" },
  { house: 6, lon: 5 + 32 / 60 + 60, label: "6 · Gemini" },
  { house: 7, lon: 24 + 34 / 60 + 60, label: "DSC · Gemini" },
  { house: 8, lon: 2 + 35 / 60 + 120, label: "8 · Leo" },
  { house: 9, lon: 14 + 40 / 60 + 150, label: "9 · Virgo" },
  { house: 10, lon: 19 + 15 / 60 + 180, label: "MC · Libra" },
  { house: 11, lon: 14 + 57 / 60 + 210, label: "11 · Scorpio" },
  { house: 12, lon: 5 + 32 / 60 + 240, label: "12 · Sagittarius" },
];

export const META = {
  name: "Saige K",
  date: "Monday, 26 July 2004",
  time: "6:21 pm EDT",
  place: "Port Huron, Michigan",
  coords: "42.97° N, 82.42° W",
  zone: "America/Detroit · UTC−4",
  julian: "2453213.43125",
  zodiac: "Tropical",
  houses: "Placidus (Whole Sign beside)",
  node: "True Node",
  engine: "Swiss Ephemeris 2.10.03",
  sunAltitude: "+26.5° — day chart",
  oneCut: "A fire face, a vault heart, a surgical mind.",
  thesis:
    "Fire at the door, a vault for a heart, a blade for a mind — and a life that becomes real when she stops performing the underworld and starts living in a body that is allowed to stay.",
};

export const ELEMENTS = {
  fire: 3,
  earth: 2,
  air: 2,
  water: 3,
};

export const MODALITIES = {
  cardinal: 1,
  fixed: 4,
  mutable: 5,
};
