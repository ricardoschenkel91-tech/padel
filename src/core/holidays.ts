/**
 * Nederlandse feestdagen (berekend) en schoolvakanties regio Noord (data).
 * Los van de kernlogica en makkelijk bij te werken. Feestdagen/vakanties
 * blokkeren het spelen niet — ze geven alleen een markering/sfeer (spec §24).
 */

import { addDays, weekday, type DateStr } from "./dates";

export interface Holiday {
  name: string;
  emoji: string;
}
export interface SchoolVacation {
  name: string;
  from: DateStr;
  to: DateStr;
}

function ymd(y: number, m: number, d: number): DateStr {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Paaszondag (Gregoriaans, Meeus/Jones/Butcher). */
function easterSunday(y: number): DateStr {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(y, month, day);
}

const cache: Record<number, Record<string, Holiday>> = {};

function holidaysForYear(y: number): Record<string, Holiday> {
  if (cache[y]) return cache[y];
  const map: Record<string, Holiday> = {};
  const add = (date: DateStr, name: string, emoji: string) => {
    map[date] = { name, emoji };
  };

  add(ymd(y, 1, 1), "Nieuwjaarsdag", "🎉");
  add(ymd(y, 2, 14), "Valentijnsdag", "💘");
  // Koningsdag: 27 april, of 26 april als 27 op zondag valt.
  const king = weekday(ymd(y, 4, 27)) === 0 ? ymd(y, 4, 26) : ymd(y, 4, 27);
  add(king, "Koningsdag", "👑");
  add(ymd(y, 5, 5), "Bevrijdingsdag", "🇳🇱");
  add(ymd(y, 10, 31), "Halloween", "🎃");
  add(ymd(y, 12, 5), "Sinterklaas", "🎁");
  add(ymd(y, 12, 25), "Eerste Kerstdag", "🎄");
  add(ymd(y, 12, 26), "Tweede Kerstdag", "🎄");
  add(ymd(y, 12, 31), "Oudjaarsdag", "🎆");

  const easter = easterSunday(y);
  add(addDays(easter, -2), "Goede Vrijdag", "✝️");
  add(easter, "Eerste Paasdag", "🐣");
  add(addDays(easter, 1), "Tweede Paasdag", "🐣");
  add(addDays(easter, 39), "Hemelvaartsdag", "☁️");
  add(addDays(easter, 49), "Eerste Pinksterdag", "🕊️");
  add(addDays(easter, 50), "Tweede Pinksterdag", "🕊️");

  cache[y] = map;
  return map;
}

/** Feestdag op een datum, of null. */
export function holidayFor(date: DateStr): Holiday | null {
  const y = Number(date.slice(0, 4));
  return holidaysForYear(y)[date] ?? null;
}

/**
 * Schoolvakanties regio Noord (bij benadering; scholen kunnen afwijken —
 * makkelijk bij te werken). Voeg gerust jaren toe.
 */
export const SCHOOL_VACATIONS_NOORD: SchoolVacation[] = [
  { name: "Kerstvakantie", from: "2025-12-20", to: "2026-01-04" },
  { name: "Voorjaarsvakantie", from: "2026-02-14", to: "2026-02-22" },
  { name: "Meivakantie", from: "2026-04-25", to: "2026-05-03" },
  { name: "Zomervakantie", from: "2026-07-04", to: "2026-08-16" },
  { name: "Herfstvakantie", from: "2026-10-10", to: "2026-10-18" },
  { name: "Kerstvakantie", from: "2026-12-19", to: "2027-01-03" },
  { name: "Voorjaarsvakantie", from: "2027-02-20", to: "2027-02-28" },
];

/** Schoolvakantie waarin een datum valt, of null. */
export function schoolVacationFor(date: DateStr): SchoolVacation | null {
  return SCHOOL_VACATIONS_NOORD.find((v) => date >= v.from && date <= v.to) ?? null;
}
