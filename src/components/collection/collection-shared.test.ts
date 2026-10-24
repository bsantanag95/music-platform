import { describe, expect, it } from "vitest";
import { filtersQueryString } from "./collection-shared";

describe("filtersQueryString", () => {
  it("escribe solo los filtros con valor y conserva las demás claves", () => {
    expect(filtersQueryString("?tab=wanted", { q: "dokken", sort: undefined })).toBe("tab=wanted&q=dokken");
  });

  it("quita un filtro que vuelve a su valor por defecto", () => {
    expect(filtersQueryString("?format=cd&q=x", { format: undefined, q: "x" })).toBe("q=x");
  });

  it("sin filtros activos devuelve una query vacía", () => {
    expect(filtersQueryString("", { q: undefined, format: undefined })).toBe("");
  });
});
