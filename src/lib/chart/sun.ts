import type { SignId } from "./types";

/** Tropical sun-sign from calendar date (month 1–12). */
export function sunSignOn(month: number, day: number): SignId {
  const n = month * 100 + day;
  if (n >= 321 && n <= 419) return "aries";
  if (n >= 420 && n <= 520) return "taurus";
  if (n >= 521 && n <= 620) return "gemini";
  if (n >= 621 && n <= 722) return "cancer";
  if (n >= 723 && n <= 822) return "leo";
  if (n >= 823 && n <= 922) return "virgo";
  if (n >= 923 && n <= 1022) return "libra";
  if (n >= 1023 && n <= 1121) return "scorpio";
  if (n >= 1122 && n <= 1221) return "sagittarius";
  if (n >= 1222 || n <= 119) return "capricorn";
  if (n >= 120 && n <= 218) return "aquarius";
  return "pisces";
}

function monthLength(month: number, year?: number) {
  if (year && year >= 1) return new Date(year, month, 0).getDate();
  if (month === 2) return 29;
  return new Date(2001, month, 0).getDate();
}

/** Calendar months the sun actually occupies for this sign. */
export function monthsForSign(id: SignId): number[] {
  const months: number[] = [];
  for (let m = 1; m <= 12; m++) {
    if (daysForSign(id, m).length > 0) months.push(m);
  }
  return months;
}

/** Days in `month` that belong to this sign. Year matters for Feb 29. */
export function daysForSign(id: SignId, month: number, year?: number): number[] {
  if (month < 1 || month > 12) return [];
  const last = monthLength(month, year);
  const days: number[] = [];
  for (let d = 1; d <= last; d++) {
    if (sunSignOn(month, d) === id) days.push(d);
  }
  return days;
}

export function isDateInSign(id: SignId, month: number, day: number): boolean {
  return month >= 1 && day >= 1 && sunSignOn(month, day) === id;
}

export function formatBirth(month: number, day: number, year: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const name = months[month - 1] ?? "";
  return `${day} ${name} ${year}`;
}

export function formatClock(hour: number, minute: number): string {
  const mer = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${mer}`;
}
