import { describe, expect, it } from "vitest";
import { albumFiltersActive, genrePageHref, parseGenreParams } from "./page-params";

describe("parseGenreParams", () => {
  it("sin parámetros es el Resumen con los predeterminados", () => {
    expect(parseGenreParams({})).toEqual({
      tab: "overview",
      q: "",
      category: undefined,
      decade: undefined,
      sub: undefined,
      exact: false,
      albumSort: "best",
      artistSort: "albums",
      view: "grid",
      page: 1,
    });
  });

  it("una pestaña desconocida o el valor del Resumen caen en el Resumen", () => {
    expect(parseGenreParams({ tab: "canciones" }).tab).toBe("overview");
    expect(parseGenreParams({ tab: "overview" }).tab).toBe("overview");
    expect(parseGenreParams({ tab: "albums" }).tab).toBe("albums");
    expect(parseGenreParams({ tab: "lists" }).tab).toBe("lists");
  });

  it("valores inválidos se reemplazan por el predeterminado", () => {
    const params = parseGenreParams({ orden: "cualquiera", decada: "1975", tipo: "bootleg", page: "0", vista: "x", solo: "si" });
    expect(params).toMatchObject({ albumSort: "best", artistSort: "albums", decade: undefined, category: undefined, page: 1, view: "grid", exact: false });
  });

  it("lee cada filtro válido", () => {
    const params = parseGenreParams({
      tab: "albums",
      q: "  Pink  ",
      tipo: "studio",
      decada: "1970",
      sub: " Neo-Prog ",
      solo: "1",
      orden: "recientes",
      vista: "lista",
      page: "3",
    });
    expect(params).toMatchObject({
      tab: "albums",
      q: "Pink",
      category: "studio",
      decade: 1970,
      sub: "neo-prog",
      exact: true,
      albumSort: "newest",
      view: "list",
      page: 3,
    });
  });

  it("el mismo orden se interpreta según la pestaña", () => {
    expect(parseGenreParams({ orden: "seguidos" })).toMatchObject({ artistSort: "followed", albumSort: "best" });
    expect(parseGenreParams({ orden: "az" })).toMatchObject({ artistSort: "az", albumSort: "az" });
  });

  it("toma el primer valor si un parámetro viene repetido y recorta el texto largo", () => {
    expect(parseGenreParams({ tab: ["artists", "albums"] }).tab).toBe("artists");
    expect(parseGenreParams({ q: "x".repeat(500) }).q).toHaveLength(100);
  });
});

describe("genrePageHref", () => {
  const base = parseGenreParams({});

  it("el Resumen no lleva parámetros", () => {
    expect(genrePageHref("shoegaze", base)).toBe("/genre/shoegaze");
  });

  it("solo escribe lo que no es predeterminado", () => {
    const albums = { ...base, tab: "albums" as const };
    expect(genrePageHref("shoegaze", albums)).toBe("/genre/shoegaze?tab=albums");
    expect(genrePageHref("shoegaze", albums, { category: "studio", albumSort: "newest", view: "list" })).toBe(
      "/genre/shoegaze?tab=albums&tipo=studio&orden=recientes&vista=lista",
    );
  });

  it("cambiar un filtro vuelve a la página 1, salvo que se fije la página", () => {
    const albums = { ...base, tab: "albums" as const, page: 3 };
    expect(genrePageHref("g", albums, { category: "studio" })).toBe("/genre/g?tab=albums&tipo=studio");
    expect(genrePageHref("g", albums, { page: 4 })).toBe("/genre/g?tab=albums&page=4");
    expect(genrePageHref("g", albums, { view: "list" })).toBe("/genre/g?tab=albums&vista=lista&page=3");
  });

  it("ignora los filtros de otra pestaña", () => {
    const withFilter = { ...base, category: "studio" as const, tab: "artists" as const };
    expect(genrePageHref("g", withFilter)).toBe("/genre/g?tab=artists");
    expect(genrePageHref("g", { ...withFilter, artistSort: "az" })).toBe("/genre/g?tab=artists&orden=az");
  });

  it("codifica el texto de búsqueda", () => {
    expect(genrePageHref("g", { ...base, tab: "albums", q: "AC/DC & más" })).toBe("/genre/g?tab=albums&q=AC%2FDC+%26+m%C3%A1s");
  });
});

describe("albumFiltersActive", () => {
  it("detecta filtros distintos del predeterminado", () => {
    expect(albumFiltersActive(parseGenreParams({}))).toBe(false);
    expect(albumFiltersActive(parseGenreParams({ vista: "lista", page: "2" }))).toBe(false);
    expect(albumFiltersActive(parseGenreParams({ tipo: "studio" }))).toBe(true);
    expect(albumFiltersActive(parseGenreParams({ orden: "az" }))).toBe(true);
    expect(albumFiltersActive(parseGenreParams({ solo: "1" }))).toBe(true);
  });
});
