import { describe, expect, it } from "vitest";
import { holidayFor, schoolVacationFor } from "../holidays";

describe("feestdagen", () => {
  it("vaste feestdagen", () => {
    expect(holidayFor("2026-01-01")?.name).toBe("Nieuwjaarsdag");
    expect(holidayFor("2026-12-25")?.name).toBe("Eerste Kerstdag");
    expect(holidayFor("2026-12-25")?.emoji).toBe("🎄");
    expect(holidayFor("2026-10-31")?.name).toBe("Halloween");
  });

  it("Pasen 2026 (5 april) en afgeleiden", () => {
    expect(holidayFor("2026-04-03")?.name).toBe("Goede Vrijdag");
    expect(holidayFor("2026-04-05")?.name).toBe("Eerste Paasdag");
    expect(holidayFor("2026-04-06")?.name).toBe("Tweede Paasdag");
    expect(holidayFor("2026-05-14")?.name).toBe("Hemelvaartsdag"); // 5 apr + 39
  });

  it("Koningsdag 2026 op 27 april (geen zondag)", () => {
    expect(holidayFor("2026-04-27")?.name).toBe("Koningsdag");
  });

  it("gewone dag heeft geen feestdag", () => {
    expect(holidayFor("2026-08-24")).toBeNull();
  });

  it("schoolvakantie Noord", () => {
    expect(schoolVacationFor("2026-07-10")?.name).toBe("Zomervakantie");
    expect(schoolVacationFor("2026-08-24")).toBeNull();
  });
});
