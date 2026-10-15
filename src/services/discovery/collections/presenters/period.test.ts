import { describe, expect, it } from "vitest";
import { firstOfMonth, monthPeriod, quarterPeriod, spotlightPeriod } from "./period";

describe("monthPeriod", () => {
  it("interpreta AAAA-MM con sus límites en UTC", () => {
    expect(monthPeriod("2026-10")).toEqual({
      year: 2026,
      month: 10,
      bounds: { start: "2026-10-01T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z" },
    });
  });

  it("diciembre cierra en enero del año siguiente", () => {
    expect(monthPeriod("2026-12")!.bounds.end).toBe("2027-01-01T00:00:00.000Z");
  });

  it("un período ilegible es null", () => {
    for (const bad of [null, "evergreen", "2026-13", "2026-00", "2026-Q4", "26-10"]) expect(monthPeriod(bad), String(bad)).toBeNull();
  });
});

describe("quarterPeriod", () => {
  it("interpreta AAAA-Qn con límites de trimestre", () => {
    expect(quarterPeriod("2026-Q4")).toEqual({
      year: 2026,
      quarter: 4,
      bounds: { start: "2026-10-01T00:00:00.000Z", end: "2027-01-01T00:00:00.000Z" },
    });
    expect(quarterPeriod("2026-Q1")!.bounds).toEqual({ start: "2026-01-01T00:00:00.000Z", end: "2026-04-01T00:00:00.000Z" });
  });

  it("un trimestre inválido es null", () => {
    for (const bad of [null, "2026-Q5", "2026-Q0", "2026-10", "evergreen"]) expect(quarterPeriod(bad), String(bad)).toBeNull();
  });
});

describe("spotlightPeriod", () => {
  it("saca la familia de AAAA-Www-familia", () => {
    expect(spotlightPeriod("2026-W41-punk")).toEqual({ family: "punk" });
    expect(spotlightPeriod("2026-W41-r-b-soul")).toEqual({ family: "r-b-soul" });
  });

  it("un período sin familia es null", () => {
    for (const bad of [null, "2026-W41", "evergreen", "2026-10"]) expect(spotlightPeriod(bad), String(bad)).toBeNull();
  });
});

describe("firstOfMonth", () => {
  it("rellena el mes a dos dígitos", () => {
    expect(firstOfMonth(2026, 3)).toBe("2026-03-01");
  });
});
