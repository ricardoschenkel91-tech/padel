import { describe, expect, it } from "vitest";
import { isAutoSelectable, validGroups } from "../restrictions";
import { seedGroupState } from "../seed";
import type { CombinationOverride } from "../types";

const state = seedGroupState();
const restrictions = Object.values(state.restrictions);
const date = "2026-09-01";

const V = "vincent-k";
const C = "claudia-tk";
const R = "ricardo-s";
const L = "lars-v";
const K = "kay-s";

describe("combinatiebeperking Vincent K & Claudia TK (spec §12)", () => {
  it("worden niet automatisch samen in dezelfde groep van vier gezet", () => {
    const groups = validGroups([V, C, R, L], 4, date, restrictions, state.overrides);
    expect(groups).toHaveLength(0); // enige viertal bevat het paar → geblokkeerd
  });

  it("bij vijf spelers blijven de viertallen zónder het paar geldig", () => {
    const groups = validGroups([V, C, R, L, K], 4, date, restrictions, state.overrides);
    // C(5,4)=5 viertallen; 3 bevatten zowel V als C → 2 geldig.
    expect(groups).toHaveLength(2);
    for (const g of groups) {
      expect(g.includes(V) && g.includes(C)).toBe(false);
    }
  });

  it("een datum-specifieke override staat het paar voor dat moment toe", () => {
    const overrides: CombinationOverride[] = [
      { restrictionId: "vincent-claudia", date, note: "Opvang geregeld" },
    ];
    expect(isAutoSelectable([V, C, R, L], date, restrictions, overrides)).toBe(true);
    expect(validGroups([V, C, R, L], 4, date, restrictions, overrides)).toHaveLength(1);
  });

  it("beschikbaarheid van beide spelers blijft bestaan (regel raakt alleen selectie)", () => {
    // De beperking verwijdert niets uit de spelerslijst.
    expect(state.players[V].active).toBe(true);
    expect(state.players[C].active).toBe(true);
  });
});
