import { describe, expect, it } from "vitest";
import { discDateValue, parseDiscDate } from "./disc-date";

describe("parseDiscDate", () => {
  it("respeta la precisión de la fecha", () => {
    expect(parseDiscDate("2025-06-06")).toEqual({ year: 2025, month: 6, day: 6 });
    expect(parseDiscDate("2025-06")).toEqual({ year: 2025, month: 6, day: null });
    expect(parseDiscDate("2025")).toEqual({ year: 2025, month: null, day: null });
  });

  it("sin fecha o con un formato desconocido devuelve null", () => {
    expect(parseDiscDate(null)).toBeNull();
    expect(parseDiscDate("junio 2025")).toBeNull();
  });

  it("discDateValue arma la fecha en UTC", () => {
    expect(discDateValue({ year: 2025, month: 6, day: 6 }).toISOString()).toBe("2025-06-06T00:00:00.000Z");
  });
});
