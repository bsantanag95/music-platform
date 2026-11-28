import { describe, expect, it } from "vitest";
import { coverageLevel, edgeSplits, groupEdgeArtistsByRest, restAfterEdgeArtist } from "./coverage";
import { tokenize } from "./normalize";

describe("edgeSplits", () => {
  it("genera particiones con el artista en cada extremo y resto no vacío", () => {
    const splits = edgeSplits(["dokken", "kiss", "of", "death"]);
    expect(splits).toHaveLength(6);
    expect(splits).toContainEqual({
      artistTokens: ["dokken"],
      restTokens: ["kiss", "of", "death"],
      side: "start",
    });
    expect(splits).toContainEqual({
      artistTokens: ["kiss", "of", "death"],
      restTokens: ["dokken"],
      side: "end",
    });
  });

  it("una sola palabra no tiene particiones", () => {
    expect(edgeSplits(["kiss"])).toEqual([]);
  });
});

describe("restAfterEdgeArtist", () => {
  const query = tokenize("dokken kiss of death");

  it("reconoce el artista al inicio o al final", () => {
    expect(restAfterEdgeArtist(query, "Dokken")).toEqual(["kiss", "of", "death"]);
    expect(restAfterEdgeArtist(query, "Kiss of Death")).toEqual(["dokken"]);
  });

  it("ignora el artista en medio o si ocupa toda la consulta", () => {
    expect(restAfterEdgeArtist(query, "Kiss")).toBeNull();
    expect(restAfterEdgeArtist(tokenize("kiss"), "KISS")).toBeNull();
  });
});

describe("groupEdgeArtistsByRest", () => {
  it("los homónimos que dejan el mismo resto van en un solo grupo, en su orden", () => {
    const artists = [
      { id: "pink-1", name: "Pink" },
      { id: "floyd-1", name: "Floyd" },
      { id: "pink-2", name: "P!nk" },
      { id: "pink-3", name: "pink" },
      { id: "otro", name: "Queen" },
    ];
    expect([...groupEdgeArtistsByRest(tokenize("pink floyd"), artists)]).toEqual([
      ["floyd", ["pink-1", "pink-3"]],
      ["pink", ["floyd-1"]],
    ]);
  });

  it("un artista que no ocupa un extremo no entra", () => {
    expect(groupEdgeArtistsByRest(tokenize("dokken kiss of death"), [{ id: "kiss", name: "Kiss" }]).size).toBe(0);
  });
});

describe("coverageLevel — artista y artículo", () => {
  it("la consulta es el nombre del artista → nivel 1 aunque el título sea otro", () => {
    expect(coverageLevel("pink floyd", "The Wall", ["Pink Floyd"])).toBe(1);
  });

  it("un disco que se llama como la consulta sigue siendo nivel 2 si el artista es otro", () => {
    expect(coverageLevel("pink floyd", "Pink Floyd", ["Masryat"])).toBe(2);
  });

  it("el disco autotitulado del artista cuenta con su discografía (nivel 1)", () => {
    expect(coverageLevel("weezer", "Weezer", ["Weezer"])).toBe(1);
  });

  it("ignora un artículo inicial en el título exacto", () => {
    expect(coverageLevel("dark side of the moon", "The Dark Side of the Moon", ["Pink Floyd"])).toBe(2);
    expect(coverageLevel("the wall", "Wall", ["X"])).toBe(2);
    expect(coverageLevel("the", "The", ["X"])).toBe(2);
  });
});

describe("coverageLevel", () => {
  it("artista delante o detrás + título exacto → nivel 1", () => {
    expect(coverageLevel("kiss destroyer", "Destroyer", ["KISS"])).toBe(1);
    expect(coverageLevel("destroyer kiss", "Destroyer", ["KISS"])).toBe(1);
    expect(coverageLevel("dokken kiss of death", "Kiss of Death", ["Dokken"])).toBe(1);
  });

  it("título igual a la consulta completa → nivel 2", () => {
    expect(coverageLevel("destroyer", "Destroyer", ["KISS"])).toBe(2);
  });

  it("todas las palabras cubiertas sin corte limpio → nivel 3", () => {
    expect(coverageLevel("kiss destroyer", "Destroyer Demos", ["KISS"])).toBe(3);
    expect(coverageLevel("destroyer", "Destroyer Demos", ["KISS"])).toBe(3);
  });

  it("palabras sin cubrir → nivel 4", () => {
    expect(coverageLevel("dokken kiss of death", "Kiss of Death", ["New Order"])).toBe(4);
    expect(coverageLevel("kiss destroyer", "Void", ["Destroyer Destroyer"])).toBe(4);
  });

  it("el separador explícito cuenta como espacio", () => {
    expect(coverageLevel("KISS - Destroyer", "Destroyer", ["KISS"])).toBe(1);
  });

  it("tolera acentos y puntuación", () => {
    expect(coverageLevel("motorhead ace of spades", "Ace of Spades", ["Motörhead"])).toBe(1);
  });
});
