/**
 * Seed-/demodata (spec §6, §37). Zeven vaste spelers, tien inactieve reserves,
 * vier locaties, de combinatiebeperking Vincent–Claudia en de groepsinstellingen
 * voor Nederland. Referentiedata volgens de aangeleverde roosters.
 */

import { TIMES_222, TIMES_223 } from "./schedules";
import type {
  CombinationRestriction,
  GroupSettings,
  GroupState,
  Location,
  Player,
} from "./types";

const COLORS = [
  "#0FB3A6", "#f2a63c", "#7a6cf0", "#e2683f",
  "#3f7fe0", "#12a98a", "#d24c8e", "#5b8c1e",
];

let seq = 0;
function player(p: Partial<Player> & Pick<Player, "fullName" | "scheduleType">): Player {
  const id = p.id ?? p.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const idx = seq++;
  return {
    id,
    displayName: p.displayName ?? p.fullName.split(" ")[0],
    active: p.active ?? true,
    reserve: p.reserve ?? false,
    role: p.role ?? "SPELER",
    color: p.color ?? COLORS[idx % COLORS.length],
    createdAt: 1_000 + idx,
    ...p,
    fullName: p.fullName,
    scheduleType: p.scheduleType,
  };
}

export function seedPlayers(): Player[] {
  seq = 0;
  const core: Player[] = [
    player({ fullName: "Ricardo S", scheduleType: "222", referenceDate: "2026-08-24", shiftTimes: TIMES_222, role: "BEHEERDER" }),
    player({ fullName: "Lars V", scheduleType: "dagdienst" }),
    // Dwayne: referentiedatum voorlopig — bevestig zijn echte "eerste 3×OD-dag".
    player({ fullName: "Dwayne C", scheduleType: "223", referenceDate: "2026-08-14", shiftTimes: TIMES_223 }),
    player({ fullName: "Kay S", scheduleType: "dagdienst" }),
    player({ fullName: "Claudia TK", scheduleType: "dagdienst" }),
    player({ fullName: "Vincent K", scheduleType: "dagdienst" }),
    player({ fullName: "Maurice T", scheduleType: "223", referenceDate: "2026-08-23", shiftTimes: TIMES_223, role: "BEHEERDER" }),
  ];
  const reserves: Player[] = Array.from({ length: 10 }, (_, i) =>
    player({
      id: "reserve-" + (i + 1),
      fullName: "Reserve " + (i + 1),
      scheduleType: "dagdienst",
      active: false,
      reserve: true,
      role: "RESERVE",
    }),
  );
  return [...core, ...reserves];
}

export function seedLocations(): Location[] {
  return [
    { id: "zuidbroek", name: "Padelclub Zuidbroek", address: "Burgemeester Omtaweg 4", postcode: "9636 EM", city: "Zuidbroek", indoor: true, active: true },
    { id: "punto", name: "Punto Padel", address: "Produktieweg 12", postcode: "9601 MA", city: "Hoogezand", indoor: true, active: true },
    { id: "peakz-groningen", name: "Peakz Padel Groningen Euroborg", address: "Bornholmstraat 46", postcode: "9723 AZ", city: "Groningen", indoor: true, active: true },
    { id: "peakz-assen", name: "Peakz Padel Assen Fokkerstraat", address: "A.H.G. Fokkerstraat 7", postcode: "9403 AM", city: "Assen", indoor: true, active: true },
  ];
}

export function seedRestrictions(groupId: string): CombinationRestriction[] {
  return [
    {
      id: "vincent-claudia",
      groupId,
      playerA: "vincent-k",
      playerB: "claudia-tk",
      active: true,
      type: "NIET_AUTO_SAMEN",
      reason: "Gezamenlijke opvang nodig",
    },
  ];
}

export function seedSettings(): GroupSettings {
  return {
    id: "schenkel-padel",
    name: "Schenkel Padel",
    description: "Vriendengroep padel",
    timezone: "Europe/Amsterdam",
    minPlayers: 4,
    defaultDurationMin: 120,
    padelStart: 8,
    padelEnd: 22,
    lastBookingStart: 22,
    durationsMin: [60, 90, 120, 150, 180],
  };
}

export function seedGroupState(): GroupState {
  const settings = seedSettings();
  const players = Object.fromEntries(seedPlayers().map((p) => [p.id, p]));
  const restrictions = Object.fromEntries(
    seedRestrictions(settings.id).map((r) => [r.id, r]),
  );
  const locations = Object.fromEntries(seedLocations().map((l) => [l.id, l]));
  return { settings, players, restrictions, overrides: [], locations, availability: {}, bookings: {} };
}
