import { describe, it, expect } from "vitest";
import { normalizeReleaseDate } from "./mappers";

describe("normalizeReleaseDate", () => {
  it("conserva una fecha completa YYYY-MM-DD", () => {
    expect(normalizeReleaseDate("1985-06-15")).toBe("1985-06-15");
    expect(normalizeReleaseDate("1973-03-01")).toBe("1973-03-01");
  });

  it("devuelve null para una fecha con precisión anual", () => {
    expect(normalizeReleaseDate("1985")).toBeNull();
  });

  it("devuelve null para una fecha con precisión mensual", () => {
    expect(normalizeReleaseDate("1985-06")).toBeNull();
  });

  it("devuelve null cuando la fecha está ausente", () => {
    expect(normalizeReleaseDate(undefined)).toBeNull();
  });

  it("devuelve null para formatos inválidos", () => {
    expect(normalizeReleaseDate("15/06/1985")).toBeNull();
    expect(normalizeReleaseDate("1985-13-40")).toBeNull();
    expect(normalizeReleaseDate("invalid")).toBeNull();
    expect(normalizeReleaseDate("1985-06-15T00:00:00Z")).toBeNull();
  });
});
