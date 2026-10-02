import { describe, expect, it } from "vitest";
import { assignFamilies, emptyMainFamilies, validateCuration, type GenreCuration, type GenreNode } from "./families";

// Grafo chico con la forma real de MusicBrainz: rock → shoegaze → blackgaze (fusión), hip hop →
// trap → trap latino, raíces regionales, un huérfano y un descriptor.
const nodes: GenreNode[] = [
  { name: "rock", parents: [], fusionOf: [] },
  { name: "shoegaze", parents: ["rock"], fusionOf: [] },
  { name: "metal", parents: [], fusionOf: [] },
  { name: "black metal", parents: ["metal"], fusionOf: [] },
  { name: "blackgaze", parents: [], fusionOf: ["black metal", "shoegaze"] },
  { name: "hip hop", parents: [], fusionOf: [] },
  { name: "trap", parents: ["hip hop"], fusionOf: [] },
  { name: "trap latino", parents: ["trap"], fusionOf: [] },
  { name: "neoperreo trap", parents: ["trap latino"], fusionOf: [] },
  { name: "cumbia", parents: [], fusionOf: [] },
  { name: "flamenco", parents: [], fusionOf: [] },
  { name: "nueva canción", parents: ["singer-songwriter"], fusionOf: [] },
  { name: "nueva canción española", parents: ["nueva canción"], fusionOf: [] },
  { name: "singer-songwriter", parents: [], fusionOf: [] },
  { name: "mpb", parents: [], fusionOf: [] },
  { name: "agbadza", parents: [], fusionOf: [] },
  { name: "instrumental", parents: [], fusionOf: [] },
  { name: "asmr", parents: [], fusionOf: [] },
  { name: "emo", parents: ["rock", "post-hardcore"], fusionOf: [] },
  { name: "post-hardcore", parents: ["punk"], fusionOf: [] },
  { name: "punk", parents: [], fusionOf: [] },
];

const curation: GenreCuration = {
  roots: {
    rock: ["rock"],
    metal: ["metal"],
    "hip hop": ["hip-hop"],
    cumbia: ["latin"],
    flamenco: ["folk"],
    "singer-songwriter": ["folk"],
    punk: ["punk"],
  },
  cultural: { latin: ["trap latino", "nueva canción"] },
  overrides: { mpb: ["brazilian"], "nueva canción española": ["folk"] },
  descriptors: ["instrumental"],
  hidden: ["asmr"],
  namesEs: {},
};

describe("assignFamilies", () => {
  const result = assignFamilies(nodes, curation);

  it("asigna la familia de la raíz a todo su subárbol", () => {
    expect(result.get("shoegaze")).toEqual({ kind: "style", families: ["rock"], rule: "tree" });
  });

  it("une las familias de todas las raíces de un género con varios padres", () => {
    expect(result.get("emo")?.families).toEqual(["rock", "punk"]);
  });

  it("suma la familia cultural al género listado y a sus descendientes", () => {
    expect(result.get("trap latino")?.families).toEqual(["hip-hop", "latin"]);
    expect(result.get("neoperreo trap")?.families).toEqual(["hip-hop", "latin"]);
  });

  it("una asignación curada gana sobre el árbol (España va a Folk aunque cuelgue de lo latino)", () => {
    expect(result.get("nueva canción española")).toEqual({ kind: "style", families: ["folk"], rule: "override" });
    expect(result.get("nueva canción")?.families).toEqual(["folk", "latin"]);
  });

  it("resuelve un huérfano por fusión con las familias de sus componentes", () => {
    expect(result.get("blackgaze")).toEqual({ kind: "style", families: ["rock", "metal"], rule: "fusion" });
  });

  it("cae en Del mundo si ninguna regla aplica", () => {
    expect(result.get("agbadza")).toEqual({ kind: "style", families: ["world"], rule: "default" });
  });

  it("marca descriptores y ocultos sin familia", () => {
    expect(result.get("instrumental")).toEqual({ kind: "descriptor", families: [], rule: "descriptor" });
    expect(result.get("asmr")).toEqual({ kind: "hidden", families: [], rule: "hidden" });
  });

  it("ordena las familias como la interfaz", () => {
    expect(result.get("cumbia")?.families).toEqual(["latin"]);
    expect(result.get("mpb")?.families).toEqual(["brazilian"]);
  });
});

describe("validateCuration", () => {
  it("acepta una curaduría coherente con el grafo", () => {
    expect(validateCuration(nodes, curation)).toEqual([]);
  });

  it("detecta nombres inexistentes, raíces que dejaron de serlo y conflictos", () => {
    const broken: GenreCuration = {
      ...curation,
      roots: { ...curation.roots, shoegaze: ["rock"], "no existe": ["rock"] },
      overrides: { ...curation.overrides, renombrado: ["latin"] },
      hidden: [...curation.hidden, "instrumental"],
      namesEs: { "no está": "x", cumbia: " " },
    };
    const errors = validateCuration(nodes, broken);
    expect(errors).toContain('roots: "no existe" no existe en MusicBrainz');
    expect(errors.some((e) => e.startsWith('roots: "shoegaze" ya no es raíz'))).toBe(true);
    expect(errors).toContain('overrides: "renombrado" no existe en MusicBrainz');
    expect(errors).toContain('"instrumental" es descriptor y oculto a la vez');
    expect(errors).toContain('namesEs: "no está" no existe en MusicBrainz');
    expect(errors).toContain('namesEs: "cumbia" tiene un nombre vacío');
  });
});

describe("emptyMainFamilies", () => {
  it("lista las familias principales sin ningún género", () => {
    const empty = emptyMainFamilies(assignFamilies(nodes, curation));
    expect(empty).toContain("jazz");
    expect(empty).not.toContain("rock");
    expect(empty).not.toContain("world");
  });
});
