import { describe, expect, it } from "vitest";
import { findPlayableSlots, playableSlotsForDate, recommendedDuration } from "../slots";
import { seedGroupState } from "../seed";

const state = seedGroupState();

describe("aanbevolen speelduur (spec §7)", () => {
  it("exact 4 spelers → 90 minuten", () => {
    expect(recommendedDuration(4, 3)).toBe(90);
  });
  it("5+ spelers → 120 minuten", () => {
    expect(recommendedDuration(5, 3)).toBe(120);
  });
  it("kort venster begrenst het advies", () => {
    expect(recommendedDuration(4, 1)).toBe(60);
  });
});

describe("speelbare momenten", () => {
  it("vindt 's avonds een blok met de vier dagdienstspelers (dinsdag)", () => {
    const slots = playableSlotsForDate(state, "2026-09-01", {}, { minPlayers: 4 });
    const evening = slots.find((s) => s.window.start >= 17 && s.window.end <= 23);
    expect(evening).toBeTruthy();
    for (const id of ["lars-v", "kay-s", "claudia-tk", "vincent-k"]) {
      expect(evening!.availablePlayers).toContain(id);
    }
  });

  it("markeert Vincent+Claudia-viertal als niet-auto-selecteerbaar via warnings", () => {
    const slots = playableSlotsForDate(state, "2026-09-01", {}, { minPlayers: 4 });
    const evening = slots.find((s) => s.window.start >= 17)!;
    const warned = evening.warnings.some(
      (w) =>
        [w.a, w.b].includes("vincent-k") &&
        [w.a, w.b].includes("claudia-tk") &&
        w.type === "NIET_AUTO_SAMEN",
    );
    expect(warned).toBe(true);
  });

  it("respecteert het weekdag/weekend-filter", () => {
    const weekendOnly = findPlayableSlots(state, "2026-09-01", 14, [], {
      minPlayers: 4,
      onlyWeekend: true,
    });
    // Alle resultaten vallen op za/zo.
    for (const s of weekendOnly) {
      const wd = new Date(s.date + "T00:00:00Z").getUTCDay();
      expect([0, 6]).toContain(wd);
    }
  });

  it("levert over 14 dagen minstens één speelbaar moment", () => {
    const slots = findPlayableSlots(state, "2026-09-01", 14, [], { minPlayers: 4 });
    expect(slots.length).toBeGreaterThan(0);
  });
});
