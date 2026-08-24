import { describe, expect, it } from "vitest";
import { PATTERN_222, PATTERN_223, playerShift } from "../schedules";
import { positiveModulo } from "../dates";
import { seedGroupState } from "../seed";
import type { ShiftCode } from "../types";

const state = seedGroupState();
const maurice = state.players["maurice-t"];
const ricardo = state.players["ricardo-s"];

describe("cycluspatronen", () => {
  it("222 is 10 dagen, 223 is 35 dagen", () => {
    expect(PATTERN_222).toHaveLength(10);
    expect(PATTERN_223).toHaveLength(35);
  });

  it("positieve modulo werkt ook vóór de referentiedatum", () => {
    expect(positiveModulo(-1, 10)).toBe(9);
    expect(positiveModulo(-5, 10)).toBe(5);
    expect(positiveModulo(-36, 35)).toBe(34);
  });
});

describe("223-rooster — Maurice T (ref 2026-08-23, eerste 3×OD-dag)", () => {
  // Exact de dag-voor-dag reeks zoals aangeleverd.
  const expected: Record<string, ShiftCode> = {
    "2026-08-23": "OD", "2026-08-24": "OD", "2026-08-25": "OD",
    "2026-08-26": "MD", "2026-08-27": "MD",
    "2026-08-28": "ND", "2026-08-29": "ND",
    "2026-08-30": "V", "2026-08-31": "V", "2026-09-01": "V", "2026-09-02": "V", "2026-09-03": "V",
    "2026-09-04": "OD", "2026-09-05": "OD",
    "2026-09-06": "MD", "2026-09-07": "MD", "2026-09-08": "MD",
    "2026-09-09": "ND", "2026-09-10": "ND",
    "2026-09-11": "V", "2026-09-12": "V", "2026-09-13": "V", "2026-09-14": "V", "2026-09-15": "V",
  };

  for (const [date, shift] of Object.entries(expected)) {
    it(`${date} = ${shift}`, () => {
      expect(playerShift(maurice, date)).toBe(shift);
    });
  }

  it("herhaalt zich exact na 35 dagen", () => {
    expect(playerShift(maurice, "2026-09-27")).toBe("OD"); // 23-08 + 35
  });
});

describe("222-rooster — Ricardo S (ref 2026-08-24, eerste OD)", () => {
  const expected: Record<string, ShiftCode> = {
    "2026-08-24": "OD", "2026-08-25": "OD",
    "2026-08-26": "MD", "2026-08-27": "MD",
    "2026-08-28": "ND", "2026-08-29": "ND",
    "2026-08-30": "V", "2026-08-31": "V", "2026-09-01": "V", "2026-09-02": "V",
    "2026-09-03": "OD", // volgende cyclus
  };
  for (const [date, shift] of Object.entries(expected)) {
    it(`${date} = ${shift}`, () => {
      expect(playerShift(ricardo, date)).toBe(shift);
    });
  }

  it("datums vóór de referentiedatum kloppen ook", () => {
    expect(playerShift(ricardo, "2026-08-23")).toBe("V"); // pos -1 = 9 = V
    expect(playerShift(ricardo, "2026-08-19")).toBe("ND"); // pos -5 = 5 = ND
  });
});
