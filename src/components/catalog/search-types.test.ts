import { describe, expect, it } from "vitest";
import { parseSearchType, searchHref } from "./search-types";

describe("parseSearchType", () => {
  it("acepta los tipos nuevos", () => {
    expect(parseSearchType("artist")).toBe("artist");
    expect(parseSearchType("album")).toBe("album");
    expect(parseSearchType("song")).toBe("song");
    expect(parseSearchType("user")).toBe("user");
  });

  it("ausente o desconocido → Artistas", () => {
    expect(parseSearchType(undefined)).toBe("artist");
    expect(parseSearchType("")).toBe("artist");
    expect(parseSearchType("genre")).toBe("artist");
  });

  it("mapea los valores de las pestañas anteriores", () => {
    expect(parseSearchType("all")).toBe("artist");
    expect(parseSearchType("artists")).toBe("artist");
    expect(parseSearchType("albums")).toBe("album");
    expect(parseSearchType(["albums", "artists"])).toBe("album");
  });
});

describe("searchHref", () => {
  it("arma la URL con tipo, consulta y filtros presentes", () => {
    expect(searchHref("album", "kiss destroyer")).toBe("/search?type=album&q=kiss+destroyer");
    expect(searchHref("album", "destroyer", { category: "studio", decade: 1970, artistType: undefined })).toBe(
      "/search?type=album&q=destroyer&category=studio&decade=1970",
    );
  });
});
