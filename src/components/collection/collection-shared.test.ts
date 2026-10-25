import { describe, expect, it } from "vitest";
import type { CollectionEntry } from "@/lib/api/schemas";
import { filtersQueryString, groupEntries } from "./collection-shared";

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

describe("groupEntries", () => {
  const make = (id: string, artistName: string): CollectionEntry => ({
    format: "cd",
    attributes: [],
    note: null,
    audience: "followers",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    id,
    album: { id: `a-${id}`, title: id, coverThumbUrl: null, artistId: null, artistName },
  });

  it("da claves únicas aunque un artista aparezca en dos secciones no contiguas", () => {
    const groups = groupEntries(
      [make("1", "A"), make("2", "B"), make("3", "A")],
      "artist",
      (format) => format,
      "Sin artista",
      () => "",
    );
    expect(groups.map((group) => group.heading)).toEqual(["A", "B", "A"]);
    expect(new Set(groups.map((group) => group.key)).size).toBe(3);
  });

  it("sin agrupar devuelve una sola sección sin encabezado", () => {
    const groups = groupEntries([make("1", "A"), make("2", "B")], "none", (f) => f, "", () => "");
    expect(groups).toHaveLength(1);
    expect(groups[0]!.heading).toBeNull();
  });
});
