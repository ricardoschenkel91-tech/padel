/**
 * Beschikbaarheidsberekening. Bepaalt per speler per dag welke klok-vensters
 * beschikbaar zijn om te spelen, volgens de ploegendienst-overgangsregels
 * (spec §17) en met handmatige invoer die ALTIJD voorrang heeft (spec §8).
 *
 * De regels zijn bewust afgeleid van de buur-diensten (gisteren/vandaag/morgen),
 * zodat "eerste/opeenvolgende/laatste dienst van een blok" en de uitslaapdag
 * automatisch worden herkend zonder losse markeringen.
 */

import { addDays, weekday } from "./dates";
import type { DateStr } from "./dates";
import { playerShift, scheduleForPlayer } from "./schedules";
import type {
  AvailabilityEntry,
  AvailabilityStatus,
  Interval,
  Player,
  ShiftCode,
} from "./types";

export interface DayAvailability {
  date: DateStr;
  playerId: string;
  status: AvailabilityStatus;
  /** Beschikbare klok-vensters (leeg = niet beschikbaar). */
  intervals: Interval[];
  shift: ShiftCode | null;
  /** Uitleg: welke regel het resultaat bepaalde (spec §64). */
  reason: string;
  source: "handmatig" | "rooster" | "standaard";
}

// ---------------------------------------------------------------------------
// Interval-helpers
// ---------------------------------------------------------------------------

export function clip(iv: Interval, lo: number, hi: number): Interval | null {
  const start = Math.max(iv.start, lo);
  const end = Math.min(iv.end, hi);
  return end - start > 1e-9 ? { start, end } : null;
}

export function clipAll(list: Interval[], lo: number, hi: number): Interval[] {
  return list.map((iv) => clip(iv, lo, hi)).filter((x): x is Interval => x !== null);
}

/** Doorsnede van twee intervallenlijsten. */
export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a)
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end - start > 1e-9) out.push({ start, end });
    }
  return out;
}

// ---------------------------------------------------------------------------
// Automatische beschikbaarheid uit het rooster (spec §17)
// ---------------------------------------------------------------------------

function firstOfBlock(prev: ShiftCode, cur: ShiftCode): boolean {
  return prev !== cur;
}

/**
 * Afgeleide beschikbaarheid voor een cyclus-dienstdag, volgens de
 * standaard-overgangsregels. `times` bepaalt de werkuren per code.
 */
function cycleAvailability(
  prev: ShiftCode,
  cur: ShiftCode,
  next: ShiftCode,
  work: { OD: [number, number]; MD: [number, number]; ND: [number, number] },
): { intervals: Interval[]; reason: string } {
  switch (cur) {
    case "OD": {
      // Beschikbaar na de ochtenddienst; tussen opeenvolgende OD's tot 21:00.
      const end = next === "OD" ? 21 : 24;
      return {
        intervals: [{ start: work.OD[1], end }],
        reason:
          next === "OD"
            ? `Ochtenddienst tot ${fmt(work.OD[1])}; morgen weer OD, dus vrij tot 21:00`
            : `Ochtenddienst tot ${fmt(work.OD[1])}, daarna vrij`,
      };
    }
    case "MD": {
      // Alleen op de eerste middagdienst 's ochtends tot 12:00; anders niets.
      if (firstOfBlock(prev, cur))
        return {
          intervals: [{ start: 0, end: 12 }],
          reason: "Eerste middagdienst: alleen 's ochtends beschikbaar tot 12:00",
        };
      return { intervals: [], reason: "Middagdienst (opeenvolgend): niet beschikbaar" };
    }
    case "ND": {
      // Op de dag van de eerste nachtdienst beschikbaar 10:00–17:00; anders niets.
      if (firstOfBlock(prev, cur))
        return {
          intervals: [{ start: 10, end: 17 }],
          reason: "Eerste nachtdienst: beschikbaar 10:00–17:00",
        };
      return { intervals: [], reason: "Nachtdienst (opeenvolgend): niet beschikbaar" };
    }
    case "V": {
      // Uitslaapdag = eerste vrije dag na de nachtdienst → alleen 's avonds.
      if (prev === "ND")
        return {
          intervals: [{ start: 18, end: 24 }],
          reason: "Uitslaapdag na nachtdienst: alleen 's avonds beschikbaar",
        };
      // Dag vóór de eerste ochtenddienst: tot 22:00.
      if (next === "OD")
        return {
          intervals: [{ start: 0, end: 22 }],
          reason: "Vrije dag vóór eerste ochtenddienst: beschikbaar tot 22:00",
        };
      return { intervals: [{ start: 0, end: 24 }], reason: "Vrije dag: hele dag beschikbaar" };
    }
    default:
      return { intervals: [{ start: 0, end: 24 }], reason: "Beschikbaar" };
  }
}

/** Automatische beschikbaarheid (rooster) voor één speler op één datum. */
export function autoAvailability(player: Player, date: DateStr): DayAvailability {
  const sched = scheduleForPlayer(player);

  if (sched.kind === "weekly") {
    const w = weekday(date);
    const intervals = sched.windows[w] ?? [];
    return {
      date,
      playerId: player.id,
      status: "AUTO",
      intervals: intervals.map((iv) => ({ ...iv })),
      shift: intervals.length ? "D" : "V",
      reason: intervals.length ? "Dagdienstrooster" : "Vrij (weekend/geen werkdag)",
      source: intervals.length ? "rooster" : "standaard",
    };
  }

  if (!player.referenceDate) {
    return blank(player, date, "Geen referentiedatum ingesteld");
  }

  const cur = playerShift(player, date);
  const prev = playerShift(player, addDays(date, -1));
  const next = playerShift(player, addDays(date, 1));
  const { intervals, reason } = cycleAvailability(prev, cur, next, sched.times);

  return {
    date,
    playerId: player.id,
    status: "AUTO",
    intervals,
    shift: cur,
    reason,
    source: "rooster",
  };
}

// ---------------------------------------------------------------------------
// Volledige beschikbaarheid met voorrang (spec §8 / §61)
// ---------------------------------------------------------------------------

/**
 * Combineert automatische roosterbeschikbaarheid met handmatige invoer.
 * Handmatige invoer wint altijd van de automatische regels.
 */
export function resolveAvailability(
  player: Player,
  date: DateStr,
  manual?: AvailabilityEntry,
): DayAvailability {
  const auto = autoAvailability(player, date);

  if (!player.active) return blank(player, date, "Speler is inactief");

  if (manual && manual.status !== "AUTO") {
    const base: DayAvailability = { ...auto, status: manual.status, source: "handmatig" };
    switch (manual.status) {
      case "NIET_BESCHIKBAAR":
        return { ...base, intervals: [], reason: manual.note ?? "Handmatig: niet beschikbaar" };
      case "BESCHIKBAAR":
        return {
          ...base,
          intervals: [manual.window ?? { start: 0, end: 24 }],
          reason: manual.note ?? "Handmatig: beschikbaar",
        };
      case "MISSCHIEN":
        return {
          ...base,
          intervals: [manual.window ?? auto.intervals[0] ?? { start: 0, end: 24 }],
          reason: manual.note ?? "Handmatig: misschien",
        };
      case "NA_BEVESTIGING":
        return {
          ...base,
          intervals: manual.window ? [manual.window] : auto.intervals,
          reason: manual.note ?? "Alleen na bevestiging",
        };
    }
  }
  return auto;
}

function blank(player: Player, date: DateStr, reason: string): DayAvailability {
  return {
    date,
    playerId: player.id,
    status: "NIET_BESCHIKBAAR",
    intervals: [],
    shift: null,
    reason,
    source: "standaard",
  };
}

function fmt(h: number): string {
  const H = Math.floor(h);
  const M = Math.round((h - H) * 60);
  return String(H).padStart(2, "0") + ":" + String(M).padStart(2, "0");
}
