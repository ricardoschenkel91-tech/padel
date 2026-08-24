import type { Interval, ShiftCode } from "../core";

/** Keuzes voor de periode-selectie (aantal dagen vooruit), tot 6 maanden. */
export const PERIOD_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "1 week" },
  { value: 14, label: "2 weken" },
  { value: 31, label: "1 maand" },
  { value: 92, label: "3 maanden" },
  { value: 183, label: "6 maanden" },
];

export const DOW = ["zo", "ma", "di", "wo", "do", "vr", "za"];
export const MON = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export const SHIFT_LABEL: Record<ShiftCode, string> = {
  OD: "Ochtend",
  MD: "Middag",
  ND: "Nacht",
  D: "Dagdienst",
  V: "Vrij",
};

export function fmtHour(h: number): string {
  const H = Math.floor(h);
  const M = Math.round((h - H) * 60);
  return String(H).padStart(2, "0") + ":" + String(M).padStart(2, "0");
}

export function fmtWindow(iv: Interval): string {
  return `${fmtHour(iv.start)}–${fmtHour(iv.end)}`;
}

/** "HH:MM" → uur als kommagetal. */
export function timeToHour(s: string): number {
  const [H, M] = s.split(":").map(Number);
  return H + (M || 0) / 60;
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}u${m}` : `${h} uur`;
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function niceDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MON[m - 1]}`;
}
