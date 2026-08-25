/**
 * Ploegendienst-engine. Codeert géén roosters hard in de UI (spec §13): een
 * rooster is data (een herhalende lijst dienstcodes + referentiedatum), en de
 * cycluspositie wordt met datumrekenen bepaald via een veilige positieve modulo.
 */

import { positiveModulo, toDays, weekday } from "./dates";
import type { DateStr } from "./dates";
import type {
  CycleSchedule,
  Interval,
  Player,
  ScheduleDef,
  ShiftCode,
  ShiftTimes,
  WeeklySchedule,
} from "./types";

// ---------------------------------------------------------------------------
// Standaardpatronen
// ---------------------------------------------------------------------------

/** Helper: bouw een dienstenreeks uit blokken [code, aantal]. */
export function expandBlocks(blocks: [ShiftCode, number][]): ShiftCode[] {
  const out: ShiftCode[] = [];
  for (const [code, n] of blocks) for (let i = 0; i < n; i++) out.push(code);
  return out;
}

/**
 * 5-ploegen 222-rooster — 10 dagen. Referentie = eerste ochtenddienst (positie 0).
 *   2 OD, 2 MD, 2 ND, 4 V
 */
export const PATTERN_222: ShiftCode[] = expandBlocks([
  ["OD", 2],
  ["MD", 2],
  ["ND", 2],
  ["V", 4],
]);

/**
 * 5-ploegen 223-rooster — 35 dagen. Eén doorlopende rotatie van drie fasen.
 * Referentie = eerste dag van een 3×OD-blok = start van Fase B.
 *
 *   Fase B: 3 OD, 2 MD, 2 ND, 5 V   (12)
 *   Fase C: 2 OD, 3 MD, 2 ND, 5 V   (12)
 *   Fase A: 2 OD, 2 MD, 3 ND, 4 V   (11)
 */
export const PATTERN_223: ShiftCode[] = [
  ...expandBlocks([["OD", 3], ["MD", 2], ["ND", 2], ["V", 5]]), // Fase B
  ...expandBlocks([["OD", 2], ["MD", 3], ["ND", 2], ["V", 5]]), // Fase C
  ...expandBlocks([["OD", 2], ["MD", 2], ["ND", 3], ["V", 4]]), // Fase A
];

export const TIMES_222: ShiftTimes = { OD: [6, 14], MD: [14, 22], ND: [22, 6] };
export const TIMES_223: ShiftTimes = { OD: [7, 15], MD: [15, 23], ND: [23, 7] };

/** Standaard werkweek voor het dagdienst-formulier: ma–vr 09–18, weekend vrij. */
export const DEFAULT_WORKWEEK: Record<number, [number, number] | null> = {
  1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: null, 0: null,
};

/** Bouw beschikbaarheidsvensters uit werkuren per weekdag (vrij vóór/na werk, 08–22). */
export function buildDagWindows(work: Record<number, [number, number] | null>): Record<number, Interval[]> {
  const w: Record<number, Interval[]> = {};
  for (let d = 0; d < 7; d++) {
    const job = work[d];
    if (!job) {
      w[d] = [{ start: 8, end: 22 }];
    } else {
      const wins: Interval[] = [];
      if (job[0] > 8) wins.push({ start: 8, end: job[0] });
      if (job[1] < 22) wins.push({ start: job[1], end: 22 });
      w[d] = wins;
    }
  }
  return w;
}

/** Standaard dagdienst (spec §18): ma–vr 18–23, za/zo 09–23. */
export const WEEKLY_DAGDIENST: WeeklySchedule = {
  kind: "weekly",
  windows: {
    0: [{ start: 9, end: 23 }], // zo
    1: [{ start: 18, end: 23 }],
    2: [{ start: 18, end: 23 }],
    3: [{ start: 18, end: 23 }],
    4: [{ start: 18, end: 23 }],
    5: [{ start: 18, end: 23 }],
    6: [{ start: 9, end: 23 }], // za
  },
};

// ---------------------------------------------------------------------------
// Rooster afleiden van een speler
// ---------------------------------------------------------------------------

/** Bouw de effectieve roosterdefinitie voor een speler uit diens type. */
export function scheduleForPlayer(player: Player): ScheduleDef {
  switch (player.scheduleType) {
    case "222":
      return { kind: "cycle", cycle: PATTERN_222, times: player.shiftTimes ?? TIMES_222 };
    case "223":
      return { kind: "cycle", cycle: PATTERN_223, times: player.shiftTimes ?? TIMES_223 };
    case "dagdienst":
      return player.workWeek
        ? { kind: "weekly", windows: buildDagWindows(player.workWeek) }
        : WEEKLY_DAGDIENST;
    case "aangepast":
      // Aangepaste cyclus wordt (later) op de speler opgeslagen; val terug op 222.
      return { kind: "cycle", cycle: PATTERN_222, times: player.shiftTimes ?? TIMES_222 };
  }
}

/**
 * Dienstcode op een datum voor een cyclusrooster.
 *   cycluspositie = positieveModulo(datum − referentiedatum, cycluslengte)
 */
export function shiftAt(
  schedule: CycleSchedule,
  referenceDate: DateStr,
  date: DateStr,
): ShiftCode {
  const pos = positiveModulo(toDays(date) - toDays(referenceDate), schedule.cycle.length);
  return schedule.cycle[pos];
}

/** Dienstcode voor een speler op een datum (V/D voor niet-cyclusroosters). */
export function playerShift(player: Player, date: DateStr): ShiftCode {
  const sched = scheduleForPlayer(player);
  if (sched.kind === "cycle") {
    if (!player.referenceDate) return "V";
    return shiftAt(sched, player.referenceDate, date);
  }
  // Weekly (dagdienst): toon D op werkdagen, V op vrije dagen.
  if (player.scheduleType === "dagdienst") {
    const wd = weekday(date);
    const ww = player.workWeek;
    if (ww) return ww[wd] ? "D" : "V";
    return wd >= 1 && wd <= 5 ? "D" : "V";
  }
  return "V";
}
