/**
 * Speelbare momenten zoeken (spec §10, §29). Voor elke dag berekent deze module
 * de gezamenlijke vrije tijdvensters van de beschikbare spelers en levert de
 * blokken waar minimaal N spelers tegelijk kunnen, inclusief geldige groepen van
 * vier en combinatiewaarschuwingen. Er wordt niets vooraf opgeslagen: alles wordt
 * op aanvraag uit de regels berekend (spec §41).
 */

import { addDays } from "./dates";
import type { DateStr } from "./dates";
import { resolveAvailability } from "./availability";
import type { DayAvailability } from "./availability";
import { issuesInGroup, validGroups } from "./restrictions";
import type { PairIssue } from "./restrictions";
import type { AvailabilityEntry, GroupState, Interval, Player } from "./types";

export interface SlotFilters {
  minPlayers?: number;
  block?: "ochtend" | "middag" | "avond";
  onlyWeekend?: boolean;
  onlyWeekday?: boolean;
  playerId?: string; // moet beschikbaar zijn
  minDurationMin?: number;
}

export interface PlayableSlot {
  date: DateStr;
  window: Interval; // gezamenlijk beschikbaar tijdvenster
  availablePlayers: string[]; // beschikbaar gedurende het hele blok
  maybePlayers: string[]; // status "misschien" tijdens dit blok
  validFoursomes: string[][];
  warnings: PairIssue[];
  recommendedDurationMin: number;
}

const STEP = 0.25; // 15-minuten resolutie
// Banen open 08:00–22:00; na 22:00 wordt er nooit gespeeld (spec-aanpassing).
const COURT_OPEN = 8;
const COURT_CLOSE = 22;

/** Aanbevolen speelduur volgens spec §7. */
export function recommendedDuration(playerCount: number, windowHours: number): number {
  const cap = Math.floor(windowHours * 60);
  const advies = playerCount === 4 ? 90 : 120;
  const allowed = [60, 90, 120, 150, 180].filter((d) => d <= cap);
  if (!allowed.length) return 0;
  // Kies het dichtstbijzijnde toegestane advies dat past.
  return allowed.includes(advies) ? advies : allowed[allowed.length - 1];
}

function blockWindow(block: SlotFilters["block"]): Interval | null {
  switch (block) {
    case "ochtend":
      return { start: 9, end: 12 };
    case "middag":
      return { start: 12, end: 18 };
    case "avond":
      return { start: 18, end: 22 };
    default:
      return null;
  }
}

function covers(intervals: Interval[], t: number): boolean {
  return intervals.some((iv) => t >= iv.start - 1e-9 && t < iv.end - 1e-9);
}

/** Speelbare momenten voor één dag. */
export function playableSlotsForDate(
  state: GroupState,
  date: DateStr,
  manualByKey: Record<string, AvailabilityEntry>,
  filters: SlotFilters = {},
): PlayableSlot[] {
  const { settings } = state;
  const minPlayers = filters.minPlayers ?? settings.minPlayers;
  const minDur = (filters.minDurationMin ?? 60) / 60;

  const players = Object.values(state.players).filter(
    (p): p is Player => p.active && !p.reserve,
  );

  // Beschikbaarheid per speler voor deze dag.
  const avail: Record<string, DayAvailability> = {};
  for (const p of players) {
    const manual = manualByKey[p.id + "|" + date];
    avail[p.id] = resolveAvailability(p, date, manual);
  }

  // Zoekvenster: baan-open-uren ∩ eventueel tijdblok-filter.
  let lo = COURT_OPEN;
  let hi = COURT_CLOSE;
  const bw = blockWindow(filters.block);
  if (bw) {
    lo = Math.max(lo, bw.start);
    hi = Math.min(hi, bw.end);
  }

  // Greedy: bouw blokken waar een vaste groep van ≥ minPlayers de hele tijd vrij is.
  type Cur = { start: number; end: number; ids: Set<string> };
  const blocks: Cur[] = [];
  let cur: Cur | null = null;

  const freeAt = (t: number): Set<string> => {
    const s = new Set<string>();
    for (const p of players) {
      const a = avail[p.id];
      if (a.status === "NIET_BESCHIKBAAR") continue;
      if (a.status === "MISSCHIEN") continue; // tel "misschien" niet mee als hard
      if (covers(a.intervals, t)) s.add(p.id);
    }
    return s;
  };

  for (let t = lo; t + STEP <= hi + 1e-9; t += STEP) {
    const mid = t + STEP / 2;
    const set = freeAt(mid);
    if (!cur) {
      if (set.size >= minPlayers) cur = { start: t, end: t + STEP, ids: set };
      continue;
    }
    const inter = new Set([...cur.ids].filter((x) => set.has(x)));
    if (inter.size >= minPlayers) {
      cur.ids = inter;
      cur.end = t + STEP;
    } else {
      if (cur.end - cur.start >= minDur - 1e-9) blocks.push(cur);
      cur = set.size >= minPlayers ? { start: t, end: t + STEP, ids: set } : null;
    }
  }
  if (cur && cur.end - cur.start >= minDur - 1e-9) blocks.push(cur);

  // Bouw resultaat per blok.
  const out: PlayableSlot[] = [];
  for (const b of blocks) {
    const ids = [...b.ids];
    if (filters.playerId && !b.ids.has(filters.playerId)) continue;

    const window: Interval = { start: b.start, end: b.end };
    const maybe = players
      .filter((p) => avail[p.id].status === "MISSCHIEN" && covers(avail[p.id].intervals, b.start))
      .map((p) => p.id);

    out.push({
      date,
      window,
      availablePlayers: ids,
      maybePlayers: maybe,
      validFoursomes: validGroups(
        ids,
        4,
        date,
        Object.values(state.restrictions),
        state.overrides,
        window,
      ),
      warnings: issuesInGroup(
        ids,
        date,
        Object.values(state.restrictions),
        state.overrides,
        window,
      ),
      recommendedDurationMin: recommendedDuration(ids.length, b.end - b.start),
    });
  }
  return out;
}

/** Speelbare momenten over een reeks dagen. */
export function findPlayableSlots(
  state: GroupState,
  startDate: DateStr,
  days: number,
  manualEntries: AvailabilityEntry[] = [],
  filters: SlotFilters = {},
): PlayableSlot[] {
  const manualByKey: Record<string, AvailabilityEntry> = {};
  for (const e of manualEntries) manualByKey[e.playerId + "|" + e.date] = e;

  const result: PlayableSlot[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    if (filters.onlyWeekend || filters.onlyWeekday) {
      const wknd = [0, 6].includes(new Date(date + "T00:00:00Z").getUTCDay());
      if (filters.onlyWeekend && !wknd) continue;
      if (filters.onlyWeekday && wknd) continue;
    }
    result.push(...playableSlotsForDate(state, date, manualByKey, filters));
  }
  return result;
}
