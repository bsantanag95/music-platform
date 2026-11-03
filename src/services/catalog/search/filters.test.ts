import { describe, expect, it } from "vitest";
import {
  advancedSearchHref,
  criteriaForTab,
  criterionChips,
  narrowingFields,
  removeCriterion,
  criteriaToParams,
  formatDuration,
  fromRecord,
  fromSearchParams,
  hasCriteria,
  ignoredParams,
  validateAdvancedForm,
  isQuickSearch,
  parseCriteria,
  parseDurationInput,
} from "./filters";
import { effectiveDecade, parseCatalogSearchParams } from "./params";

function read(query: string) {
  return fromSearchParams(new URLSearchParams(query));
}

describe("parseCriteria", () => {
  it("lee los campos de Artistas: varios países, ciudad, rango y estado", () => {
    expect(
      parseCriteria(
        "artist",
        read("q=x&exact=1&artistType=group&country=cl&country=AR&area=La%20Plata&beginFrom=1980&beginTo=1989&ended=1"),
        "x",
      ),
    ).toEqual({
      exact: true,
      artistType: "group",
      country: ["CL", "AR"],
      area: "La Plata",
      beginFrom: 1980,
      beginTo: 1989,
      ended: true,
    });
  });

  it("listas sin repetidos ni inválidos, con tope de 10", () => {
    expect(parseCriteria("artist", read("country=cl&country=Chile&country=CL")).country).toEqual(["CL"]);
    const many = Array.from({ length: 12 }, (_, index) => `country=${String.fromCharCode(65 + index)}A`).join("&");
    expect(parseCriteria("artist", read(many)).country).toHaveLength(10);
    expect(parseCriteria("album", read("category=studio&category=jazz&category=studio&category=live_other")).category).toEqual([
      "studio",
      "live_other",
    ]);
  });

  it("lee los campos de Álbumes y Canciones", () => {
    expect(
      parseCriteria("album", read("artist=Iron%20Maiden&artistExact=1&yearFrom=1986&yearTo=1983&category=studio")),
    ).toEqual({ artist: "Iron Maiden", artistExact: true, yearFrom: 1983, yearTo: 1986, category: ["studio"] });
    expect(
      parseCriteria("song", read("artist=Jeff%20Buckley&album=Grace&albumExact=1&durMin=7:00&durMax=60&category=studio")),
    ).toEqual({ artist: "Jeff Buckley", album: "Grace", albumExact: true, durMin: 60, durMax: 420, category: ["studio"] });
  });

  it("una bandera exacta sin su campo se ignora", () => {
    expect(parseCriteria("album", read("exact=1&artistExact=1&yearFrom=1983"))).toEqual({ yearFrom: 1983 });
    expect(parseCriteria("song", read("albumExact=1&artist=x"), "")).toEqual({ artist: "x" });
  });

  it("ignora valores inválidos, vacíos y de otro tipo sin error", () => {
    expect(parseCriteria("artist", read("country=Argentina&beginFrom=80&beginTo=2200&ended=si&area="))).toEqual({});
    expect(parseCriteria("album", read("country=GB&ended=1&durMax=60&album=x&area=y"))).toEqual({});
    expect(parseCriteria("artist", read("artist=queen&yearFrom=1980&category=studio"))).toEqual({});
    expect(parseCriteria("user", read("country=AR&artist=queen"))).toEqual({});
    expect(parseCriteria("album", read(`artist=${"x".repeat(201)}`))).toEqual({});
  });

  it("lee objetos de searchParams de página con valores repetidos", () => {
    expect(parseCriteria("artist", fromRecord({ country: ["CL", "AR"], ended: "0" }))).toEqual({
      country: ["CL", "AR"],
      ended: false,
    });
  });
});

describe("contrato del endpoint", () => {
  it("q opcional con criterios; sin nada es 400", () => {
    const parsed = parseCatalogSearchParams(new URLSearchParams("type=artist&country=CL&artistType=group"));
    expect(parsed.q).toBe("");
    expect(parsed.criteria).toEqual({ artistType: "group", country: ["CL"] });
    expect(() => parseCatalogSearchParams(new URLSearchParams("type=album"))).toThrow();
    expect(() => parseCatalogSearchParams(new URLSearchParams("type=album&q=%20&country=CL"))).toThrow();
  });

  it("el rango de años gana a la década", () => {
    expect(effectiveDecade(1970, { yearFrom: 1980 })).toBeUndefined();
    expect(effectiveDecade(1970, {})).toBe(1970);
    const parsed = parseCatalogSearchParams(new URLSearchParams("type=album&q=kiss&decade=1970&yearFrom=1980"));
    expect(parsed.decade).toBeUndefined();
  });
});

describe("utilidades", () => {
  it("hay criterios y se serializan con repetidos", () => {
    const criteria = { country: ["CL", "AR"], beginFrom: 1980, ended: false, exact: true };
    expect(hasCriteria(criteria)).toBe(true);
    expect(hasCriteria({})).toBe(false);
    expect(criteriaToParams(criteria)).toEqual([
      ["country", "CL"],
      ["country", "AR"],
      ["beginFrom", "1980"],
      ["ended", "0"],
      ["exact", "1"],
    ]);
    expect(advancedSearchHref("artist", "", { country: ["CL"] })).toBe("/search/advanced?type=artist&country=CL");
    expect(advancedSearchHref("album", " maiden ")).toBe("/search/advanced?type=album&q=maiden");
  });

  it("al cambiar de pestaña conserva artista y tipos entre Álbumes y Canciones, nunca q", () => {
    const song = { artist: "Jeff Buckley", artistExact: true, category: ["studio" as const], durMax: 420 };
    expect(criteriaForTab("album", song)).toEqual({ artist: "Jeff Buckley", artistExact: true, category: ["studio"] });
    expect(criteriaForTab("artist", song)).toEqual({});
  });

  it("la búsqueda rápida solo tiene Persona/Grupo y una categoría", () => {
    expect(isQuickSearch("artist", { artistType: "group" })).toBe(true);
    expect(isQuickSearch("album", { category: ["studio"] })).toBe(true);
    expect(isQuickSearch("album", { category: ["studio", "live_other"] })).toBe(false);
    expect(isQuickSearch("artist", { country: ["AR"] })).toBe(false);
    expect(isQuickSearch("song", { artist: "x" })).toBe(false);
  });

  it("formatea y lee duraciones", () => {
    expect(formatDuration(420)).toBe("7:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(parseDurationInput("7:00")).toBe(420);
    expect(parseDurationInput("3")).toBe(180);
    expect(parseDurationInput("3:75")).toBeUndefined();
    expect(parseDurationInput("abc")).toBeUndefined();
  });
});

describe("barra de criterios (openspec: refine-advanced-search-phase1)", () => {
  it("una pastilla por criterio en el orden del formulario; los rangos, una", () => {
    expect(
      criterionChips("artist", "kiss", { exact: true, country: ["US", "CA"], beginFrom: 1973, ended: false }),
    ).toEqual([{ id: "q" }, { id: "country", value: "US" }, { id: "country", value: "CA" }, { id: "begin" }, { id: "ended" }]);
    expect(criterionChips("album", "", { artist: "Pink Floyd", yearTo: 1979, category: ["studio"] })).toEqual([
      { id: "artist" },
      { id: "year" },
      { id: "category", value: "studio" },
    ]);
  });

  it("quitar un criterio deja el resto; un texto se lleva su coincidencia exacta", () => {
    expect(removeCriterion("kiss", { exact: true, country: ["US"] }, { id: "q" })).toEqual({
      query: "",
      criteria: { country: ["US"] },
    });
    expect(removeCriterion("", { country: ["US", "CA"] }, { id: "country", value: "US" })).toEqual({
      query: "",
      criteria: { country: ["CA"] },
    });
    expect(removeCriterion("", { country: ["US"], beginFrom: 1973 }, { id: "country", value: "US" })).toEqual({
      query: "",
      criteria: { beginFrom: 1973 },
    });
    expect(removeCriterion("x", { artist: "A", artistExact: true }, { id: "artist" }).criteria).toEqual({});
  });

  it("campos que acotan una búsqueda amplia: solo los vacíos, hasta tres", () => {
    expect(narrowingFields("artist", { country: ["CL"] })).toEqual(["beginFrom", "artistType"]);
    expect(narrowingFields("album", { category: ["live_other"] })).toEqual(["yearFrom", "artist"]);
    expect(narrowingFields("song", { durMin: 420 })).toEqual(["artist", "album"]);
  });
});

describe("validación y valores ignorados (openspec: refine-advanced-search-phase2)", () => {
  const values = (record: Record<string, string>) => (name: string) => record[name] ?? "";

  it("valida años, duraciones y el orden del rango", () => {
    expect(validateAdvancedForm("artist", values({ beginFrom: "1980", beginTo: "1989" }))).toEqual({});
    expect(validateAdvancedForm("artist", values({ beginFrom: "80" }))).toEqual({
      begin: { error: "yearFormat", field: "beginFrom" },
    });
    expect(validateAdvancedForm("album", values({ yearFrom: "1999", yearTo: "1990" }))).toEqual({
      year: { error: "rangeOrder", field: "yearFrom" },
    });
    expect(validateAdvancedForm("album", values({ yearTo: "1850" }))).toEqual({
      year: { error: "yearFormat", field: "yearTo" },
    });
    expect(validateAdvancedForm("song", values({ durMin: "7", durMax: "7:30" }))).toEqual({});
    expect(validateAdvancedForm("song", values({ durMin: "8:00", durMax: "7:30" }))).toEqual({
      duration: { error: "rangeOrder", field: "durMin" },
    });
    expect(validateAdvancedForm("song", values({ durMax: "7.30" }))).toEqual({
      duration: { error: "durationFormat", field: "durMax" },
    });
  });

  it("avisa lo que la URL trae y la búsqueda no reconoce, solo en los campos del tipo", () => {
    const params = new URLSearchParams("type=album&category=live&category=studio&yearFrom=94&country=CL&exact=1");
    const read = fromSearchParams(params);
    const criteria = parseCriteria("album", read);
    expect(ignoredParams("album", read, criteria)).toEqual(["yearFrom=94", "category=live"]);

    const artist = new URLSearchParams("country=cl&country=Chile&artistType=band");
    expect(ignoredParams("artist", fromSearchParams(artist), parseCriteria("artist", fromSearchParams(artist)))).toEqual([
      "artistType=band",
      "country=Chile",
    ]);
  });
});
