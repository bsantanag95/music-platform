import { describe, expect, it } from "vitest";
import { exploreListFiltered, exploreListHref, parseExploreListParams } from "./explore-params";

describe("parseExploreListParams", () => {
  it("sin parámetros: todos los tipos, mejor valorados, página 1", () => {
    expect(parseExploreListParams({})).toEqual({ category: undefined, sort: "best", page: 1 });
  });

  it("lee tipo, orden y página válidos", () => {
    expect(parseExploreListParams({ tipo: "studio", orden: "recientes", page: "3" })).toEqual({
      category: "studio",
      sort: "newest",
      page: 3,
    });
  });

  it("un valor inválido cae al predeterminado sin romper la URL", () => {
    expect(parseExploreListParams({ tipo: "bootleg", orden: "x", page: "-2" })).toEqual({
      category: undefined,
      sort: "best",
      page: 1,
    });
  });
});

describe("exploreListHref", () => {
  const base = parseExploreListParams({});

  it("conserva el corte y omite los valores predeterminados", () => {
    expect(exploreListHref("/explore?decada=1990", base)).toBe("/explore?decada=1990");
  });

  it("cambiar el tipo o el orden vuelve a la página 1", () => {
    const current = parseExploreListParams({ tipo: "studio", page: "4" });
    expect(exploreListHref("/explore?familia=rock", current, { sort: "az" })).toBe(
      "/explore?familia=rock&tipo=studio&orden=az",
    );
    expect(exploreListHref("/explore?familia=rock", current, { category: undefined })).toBe("/explore?familia=rock");
  });

  it("la paginación conserva tipo y orden", () => {
    const current = parseExploreListParams({ tipo: "single_ep", orden: "antiguos" });
    expect(exploreListHref("/explore?genero=grunge", current, { page: 2 })).toBe(
      "/explore?genero=grunge&tipo=single_ep&orden=antiguos&page=2",
    );
  });

  it("exploreListFiltered solo con tipo u orden distintos del predeterminado", () => {
    expect(exploreListFiltered(base)).toBe(false);
    expect(exploreListFiltered({ ...base, page: 5 })).toBe(false);
    expect(exploreListFiltered({ ...base, sort: "oldest" })).toBe(true);
  });
});
