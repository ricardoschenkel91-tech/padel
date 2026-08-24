/**
 * Datum-hulpfuncties. Werkt met datum-strings "YYYY-MM-DD" en rekent in hele
 * UTC-dagen, zodat tijdzones en zomertijd de cycluspositie nooit kunnen verstoren.
 */

export type DateStr = string; // "YYYY-MM-DD"

/** Aantal hele dagen sinds epoch voor een datum-string (tijdzone-veilig). */
export function toDays(date: DateStr): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Datum-string + n dagen. */
export function addDays(date: DateStr, n: number): DateStr {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000);
  return fromDate(t);
}

/** Verschil in hele dagen tussen twee datum-strings (a - b). */
export function daysBetween(a: DateStr, b: DateStr): number {
  return toDays(a) - toDays(b);
}

/** Weekdag: 0 = zondag ... 6 = zaterdag. */
export function weekday(date: DateStr): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isWeekend(date: DateStr): boolean {
  const w = weekday(date);
  return w === 0 || w === 6;
}

/** Positieve modulo — werkt ook correct voor datums vóór de referentiedatum. */
export function positiveModulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Datum-string van vandaag in lokale tijd. */
export function todayStr(now: Date = new Date()): DateStr {
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0")
  );
}

function fromDate(t: Date): DateStr {
  return (
    t.getUTCFullYear() +
    "-" +
    String(t.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(t.getUTCDate()).padStart(2, "0")
  );
}

/** Lijst opeenvolgende datum-strings [start .. start+count-1]. */
export function dateRange(start: DateStr, count: number): DateStr[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** ISO-8601 weeknummer. */
export function isoWeek(date: DateStr): number {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
