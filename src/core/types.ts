/**
 * Kern-datamodel (optie B: lichte variant, geen aparte database-server).
 * Deze types weerspiegelen de entiteiten uit de spec, maar als eenvoudige
 * document-vormen die in Firestore of localStorage kunnen leven. Roosters en
 * beschikbaarheid worden als REGELS opgeslagen en op aanvraag berekend — nooit
 * vooraf per dag weggeschreven (spec §41).
 */

import type { DateStr } from "./dates";

/** Een dienstcode binnen een ploegendienstcyclus. */
export type ShiftCode = "OD" | "MD" | "ND" | "V" | "D";

/** Diensttijden per code, in klok-uren [start, eind]. Eind < start = over middernacht. */
export interface ShiftTimes {
  OD: [number, number];
  MD: [number, number];
  ND: [number, number];
}

/** Tijdsinterval binnen één kalenderdag, in klok-uren (0..24). */
export interface Interval {
  start: number;
  end: number;
}

export type ScheduleType = "222" | "223" | "dagdienst" | "aangepast";

/**
 * Een roostertemplate. Twee soorten:
 *  - "cycle": een herhalende lijst dienstcodes (ploegendienst).
 *  - "weekly": vaste beschikbaarheid per weekdag (dagdienst / kantoor).
 */
export interface CycleSchedule {
  kind: "cycle";
  cycle: ShiftCode[]; // lengte = cycluslengte
  times: ShiftTimes;
}
export interface WeeklySchedule {
  kind: "weekly";
  /** Beschikbaarheid per weekdag (0 = zondag .. 6 = zaterdag). */
  windows: Record<number, Interval[]>;
}
export type ScheduleDef = CycleSchedule | WeeklySchedule;

/** Beschikbaarheidsstatus (spec §8). */
export type AvailabilityStatus =
  | "AUTO"
  | "BESCHIKBAAR"
  | "NIET_BESCHIKBAAR"
  | "MISSCHIEN"
  | "NA_BEVESTIGING";

/** Rol binnen een groep. */
export type Role = "BEHEERDER" | "SPELER" | "RESERVE";

/** Afwezigheidsperiode: uit de planning van `from` t/m `to` (of onbepaald). */
export interface Absence {
  from: DateStr;
  to?: DateStr; // leeg = onbepaald
  note?: string;
}

export interface Player {
  id: string;
  fullName: string;
  displayName: string;
  email?: string;
  phone?: string;
  active: boolean;
  reserve: boolean;
  role: Role;
  scheduleType: ScheduleType;
  /** Referentiedatum voor cyclusroosters: cycluspositie 0. */
  referenceDate?: DateStr;
  /** Eigen diensttijden (overschrijft de standaard van het type). */
  shiftTimes?: ShiftTimes;
  color: string;
  notes?: string;
  /** SHA-256 hash van de persoonlijke pincode (nooit de pincode zelf opslaan). */
  pinHash?: string;
  /** Afwezigheidsperioden (vakantie/afwezig): speler telt dan niet mee. */
  absences?: Absence[];
  createdAt: number;
}

/** Een handmatige of terugkerende beschikbaarheidsregel. */
export interface AvailabilityEntry {
  id: string;
  playerId: string;
  date: DateStr;
  status: AvailabilityStatus;
  /** Optioneel nauwkeuriger venster (bv. 19:15–22:00). */
  window?: Interval;
  note?: string;
}

export type RestrictionType =
  | "WAARSCHUWING"
  | "HARDE_BLOKKADE"
  | "NIET_AUTO_SAMEN"
  | "HANDMATIGE_GOEDKEURING";

export interface CombinationRestriction {
  id: string;
  groupId: string;
  playerA: string;
  playerB: string;
  active: boolean;
  type: RestrictionType;
  reason?: string;
  startDate?: DateStr;
  endDate?: DateStr;
}

export interface CombinationOverride {
  restrictionId: string;
  date: DateStr;
  window?: Interval;
  note?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  postcode: string;
  city: string;
  website?: string;
  bookingUrl?: string;
  indoor: boolean;
  active: boolean;
}

export interface GroupSettings {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  minPlayers: number;
  defaultDurationMin: number;
  /** Padel-uren waarbinnen naar gaten wordt gezocht. */
  padelStart: number;
  padelEnd: number;
  lastBookingStart: number; // spec: 22:00
  durationsMin: number[]; // toegestane reserveringsduren
  /** PIN-beveiliging: iedereen logt in met een persoonlijke pincode. */
  pinProtected?: boolean;
}

/** Gedeelde staat van één groep — dit is wat gesynct/opgeslagen wordt. */
export interface GroupState {
  settings: GroupSettings;
  players: Record<string, Player>;
  availability: Record<string, AvailabilityEntry>;
  restrictions: Record<string, CombinationRestriction>;
  overrides: CombinationOverride[];
  locations: Record<string, Location>;
}
