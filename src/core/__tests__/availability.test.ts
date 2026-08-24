import { describe, expect, it } from "vitest";
import { autoAvailability, resolveAvailability } from "../availability";
import { seedGroupState } from "../seed";
import type { AvailabilityEntry } from "../types";

const state = seedGroupState();
const maurice = state.players["maurice-t"];
const ricardo = state.players["ricardo-s"];
const lars = state.players["lars-v"];

describe("automatische beschikbaarheid uit rooster (spec §17)", () => {
  it("Ricardo OD-dag met OD morgen: 's avonds vrij tot 21:00", () => {
    const a = autoAvailability(ricardo, "2026-08-24"); // OD, morgen ook OD
    expect(a.shift).toBe("OD");
    expect(a.intervals).toEqual([{ start: 14, end: 21 }]);
  });

  it("Ricardo laatste OD (morgen MD): vrij na dienst tot einde dag", () => {
    const a = autoAvailability(ricardo, "2026-08-25"); // OD, morgen MD
    expect(a.intervals).toEqual([{ start: 14, end: 24 }]);
  });

  it("Maurice eerste nachtdienst: beschikbaar 10:00–17:00", () => {
    const a = autoAvailability(maurice, "2026-08-28"); // eerste ND (gisteren MD)
    expect(a.intervals).toEqual([{ start: 10, end: 17 }]);
  });

  it("Maurice tweede nachtdienst: niet beschikbaar", () => {
    const a = autoAvailability(maurice, "2026-08-29"); // ND, gisteren ND
    expect(a.intervals).toEqual([]);
  });

  it("Maurice uitslaapdag (eerste V na ND): alleen 's avonds", () => {
    const a = autoAvailability(maurice, "2026-08-30"); // V, gisteren ND
    expect(a.intervals).toEqual([{ start: 18, end: 24 }]);
  });

  it("Maurice eerste middagdienst: 's ochtends tot 12:00", () => {
    const a = autoAvailability(maurice, "2026-08-26"); // eerste MD (gisteren OD)
    expect(a.intervals).toEqual([{ start: 0, end: 12 }]);
  });

  it("dagdienst Lars: weekdag alleen 18–23, weekend 09–23", () => {
    expect(autoAvailability(lars, "2026-09-01").intervals).toEqual([{ start: 18, end: 23 }]); // di
    expect(autoAvailability(lars, "2026-09-05").intervals).toEqual([{ start: 9, end: 23 }]); // za
  });
});

describe("handmatige beschikbaarheid heeft voorrang (spec §8)", () => {
  it("handmatig 'niet beschikbaar' overschrijft een vrije roosterdag", () => {
    const manual: AvailabilityEntry = {
      id: "m1", playerId: ricardo.id, date: "2026-08-30", status: "NIET_BESCHIKBAAR",
    };
    const r = resolveAvailability(ricardo, "2026-08-30", manual);
    expect(r.status).toBe("NIET_BESCHIKBAAR");
    expect(r.intervals).toEqual([]);
    expect(r.source).toBe("handmatig");
  });

  it("handmatig venster 19:15–22:00 overschrijft automatische beschikbaarheid", () => {
    const manual: AvailabilityEntry = {
      id: "m2", playerId: maurice.id, date: "2026-08-29", status: "BESCHIKBAAR",
      window: { start: 19.25, end: 22 },
    };
    const r = resolveAvailability(maurice, "2026-08-29", manual);
    expect(r.intervals).toEqual([{ start: 19.25, end: 22 }]);
  });

  it("inactieve speler is nooit beschikbaar", () => {
    const inactief = { ...ricardo, active: false };
    expect(resolveAvailability(inactief, "2026-08-30").intervals).toEqual([]);
  });
});
