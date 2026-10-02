import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rows: [] as unknown[], calls: 0 }));
vi.mock("@/db", () => ({
  db: {
    execute: async () => {
      state.calls++;
      return state.rows;
    },
  },
}));

const { escapeLike, normalizeGenreQuery, searchGenres } = await import("./search");

beforeEach(() => {
  state.rows = [];
  state.calls = 0;
});

describe("normalizeGenreQuery", () => {
  it("recorta y acepta vacío", () => {
    expect(normalizeGenreQuery("  shoe ")).toBe("shoe");
    expect(normalizeGenreQuery(null)).toBe("");
    expect(normalizeGenreQuery(undefined)).toBe("");
  });

  it("rechaza más de 60 caracteres con VALIDATION_ERROR", () => {
    expect(() => normalizeGenreQuery("x".repeat(61))).toThrowError(expect.objectContaining({ code: "VALIDATION_ERROR" }));
    expect(normalizeGenreQuery("x".repeat(60))).toHaveLength(60);
  });
});

describe("escapeLike", () => {
  it("escapa los comodines para buscar el texto literal", () => {
    expect(escapeLike("100%_ok\\")).toBe("100\\%\\_ok\\\\");
  });
});

describe("searchGenres", () => {
  it("devuelve solo slug y nombres", async () => {
    state.rows = [{ slug: "shoegaze", name: "shoegaze", nameEs: null, extra: 1 }];
    await expect(searchGenres("shoe")).resolves.toEqual([{ slug: "shoegaze", name: "shoegaze", nameEs: null }]);
  });

  it("el texto vacío pide las sugerencias iniciales con una sola consulta", async () => {
    await searchGenres("");
    expect(state.calls).toBe(1);
  });

  it("un texto demasiado largo falla antes de consultar", async () => {
    await expect(searchGenres("x".repeat(61))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(state.calls).toBe(0);
  });
});
